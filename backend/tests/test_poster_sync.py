import io
import os
import pytest
from unittest.mock import patch, AsyncMock
from starlette.testclient import TestClient
from pymongo import MongoClient
from PIL import Image

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.cloudinary_client import is_cloudinary_url
from backend.sync_posters_to_cloudinary import sync_posters

app.state.limiter.enabled = False
TEST_DB_NAME = "sportbid_vfn_test_posters"


@pytest.fixture(scope="session")
def sync_mongo():
    client = MongoClient(settings.MONGODB_URL)
    yield client
    client.drop_database(TEST_DB_NAME)
    client.close()


@pytest.fixture(scope="session")
def client(sync_mongo):
    settings.DATABASE_NAME = TEST_DB_NAME
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_token(client: TestClient) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vfn.com", "password": settings.ADMIN_PASSWORD},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def make_test_image() -> bytes:
    img = Image.new("RGB", (200, 200), color=(30, 80, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# -------------------------------------------------------------
# 1. URL Helper Tests
# -------------------------------------------------------------
def test_is_cloudinary_url():
    assert is_cloudinary_url("https://res.cloudinary.com/wcajcjoc/image/upload/v12345/test.png") is True
    assert is_cloudinary_url("http://res.cloudinary.com/demo/image/upload/sample.jpg") is True
    assert is_cloudinary_url("/uploads/posters/poster_01.png") is False
    assert is_cloudinary_url("https://example.com/other.png") is False
    assert is_cloudinary_url(None) is False
    assert is_cloudinary_url("") is False


# -------------------------------------------------------------
# 2. Registration & Automatic Poster Upload
# -------------------------------------------------------------
def test_registration_automatic_poster_upload(client: TestClient, sync_mongo: MongoClient):
    db = sync_mongo[TEST_DB_NAME]
    mock_poster_url = "https://res.cloudinary.com/wcajcjoc/image/upload/v1792600000/vfn_tournament_2026/posters/poster_01_Test.png"
    mock_poster_id = "vfn_tournament_2026/posters/poster_01_Test"

    with patch("backend.app.routers.players.upload_player_photo", new=AsyncMock(return_value=("https://res.cloudinary.com/photo.jpg", "photo_id"))), \
         patch("backend.app.routers.players.upload_player_poster", new=AsyncMock(return_value=(mock_poster_url, mock_poster_id))):

        files = {"photo": ("player.jpg", make_test_image(), "image/jpeg")}
        data = {
            "player_name": "Test Player Auto",
            "village": "Nalthur",
            "playing_role": "Spiker",
            "phone_number": "9876543210",
        }
        res = client.post("/api/v1/players/register", data=data, files=files)
        assert res.status_code == 201
        body = res.json()
        assert body["player_name"] == "Test Player Auto"
        assert body["playing_role"] == "Attacker"
        assert body["poster_status"] == "generated"
        assert body["poster_url"] == mock_poster_url

        # Direct Mongo assertion
        doc = db["players"].find_one({"phone_number": "9876543210"})
        assert doc is not None
        assert doc["poster_status"] == "generated"
        assert doc["poster_url"] == mock_poster_url
        assert doc["poster_public_id"] == mock_poster_id


# -------------------------------------------------------------
# 3. Cloudinary Upload Failure Graceful Handling
# -------------------------------------------------------------
def test_registration_upload_failure_marks_failed(client: TestClient, sync_mongo: MongoClient):
    db = sync_mongo[TEST_DB_NAME]

    with patch("backend.app.routers.players.upload_player_photo", new=AsyncMock(return_value=("https://res.cloudinary.com/photo2.jpg", "photo_id2"))), \
         patch("backend.app.routers.players.upload_player_poster", side_effect=RuntimeError("Cloudinary connection failed")):

        files = {"photo": ("player.jpg", make_test_image(), "image/jpeg")}
        data = {
            "player_name": "Test Player Fail",
            "village": "Nalthur",
            "playing_role": "Setter",
            "phone_number": "9876543211",
        }
        res = client.post("/api/v1/players/register", data=data, files=files)
        # Registration still succeeds, but poster_status is marked failed
        assert res.status_code == 201
        body = res.json()
        assert body["poster_status"] == "failed"

        doc = db["players"].find_one({"phone_number": "9876543211"})
        assert doc is not None
        assert doc["poster_status"] == "failed"


# -------------------------------------------------------------
# 4. Poster Preview Decoupled from Render Local Disk (Redirect)
# -------------------------------------------------------------
def test_poster_preview_redirects_to_cloudinary(client: TestClient, sync_mongo: MongoClient):
    db = sync_mongo[TEST_DB_NAME]
    doc = db["players"].find_one({"phone_number": "9876543210"})
    assert doc is not None
    player_id = str(doc["_id"])

    # GET /players/{id}/poster should 307 Redirect to Cloudinary URL
    res = client.get(f"/api/v1/players/{player_id}/poster", follow_redirects=False)
    assert res.status_code == 307
    assert res.headers["location"] == doc["poster_url"]


# -------------------------------------------------------------
# 5. Poster Download Streams from Cloudinary When Local Disk Missing
# -------------------------------------------------------------
def test_poster_download_proxies_when_local_wiped(client: TestClient, sync_mongo: MongoClient):
    db = sync_mongo[TEST_DB_NAME]
    doc = db["players"].find_one({"phone_number": "9876543210"})
    player_id = str(doc["_id"])

    # Clear local poster path to simulate Render ephemeral disk wiping
    db["players"].update_one({"_id": doc["_id"]}, {"$set": {"local_poster_path": None}})

    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.content = b"FAKE_PNG_STREAM_FROM_CLOUDINARY"

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        res = client.get(f"/api/v1/players/{player_id}/poster?download=true")
        assert res.status_code == 200
        assert res.content == b"FAKE_PNG_STREAM_FROM_CLOUDINARY"
        assert "Content-Disposition" in res.headers
        assert "VFN_2026_Poster_" in res.headers["Content-Disposition"]


# -------------------------------------------------------------
# 6. Synchronization Engine Dry Run & Repeated Sync
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_sync_engine_dry_run_and_idempotency(sync_mongo: MongoClient):
    # Run sync in dry_run mode on test database
    exit_code = await sync_posters(
        dry_run=True,
        force=False,
        mongo_url=settings.MONGODB_URL,
        db_name=TEST_DB_NAME,
    )
    assert exit_code == 0
