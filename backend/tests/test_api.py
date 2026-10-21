import pytest
from starlette.testclient import TestClient
from pymongo import MongoClient

from backend.app.main import app
from backend.app.core.config import settings

# Disable rate limiter during tests
app.state.limiter.enabled = False

TEST_DB_NAME = "sportbid_vfn_test"


@pytest.fixture(scope="session")
def sync_mongo():
    """Provides synchronous pymongo client for direct assertions and cleanup."""
    client = MongoClient(settings.MONGODB_URL)
    yield client
    # Clean up test database after all tests
    client.drop_database(TEST_DB_NAME)
    client.close()


@pytest.fixture(scope="session")
def client(sync_mongo):
    """Provides a TestClient context manager with lifespan startup."""
    settings.DATABASE_NAME = TEST_DB_NAME
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_token(client: TestClient) -> str:
    """Logs in and retrieves a valid JWT bearer token."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vfn.com", "password": settings.ADMIN_PASSWORD},
    )
    assert res.status_code == 200
    data = res.json()
    return data["access_token"]


def create_dummy_image_bytes() -> bytes:
    """Creates a minimal valid PNG image byte array."""
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff"
        b"?\x00\x05\xfe\x02\xfe\xa74e\xd8\x00\x00\x00\x00IEND\xaeB`\x82"
    )


# -------------------------------------------------------------
# 1. Health Check
# -------------------------------------------------------------
def test_health_check(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "healthy"
    assert "Volleyball Friends Nalthur" in body["tournament"]


# -------------------------------------------------------------
# 2. Authentication Tests
# -------------------------------------------------------------
def test_unauthenticated_access_rejected(client: TestClient):
    # Clear any stored cookies in the test client
    client.cookies.clear()
    res = client.get("/api/v1/players")
    assert res.status_code == 401
    res2 = client.get("/api/v1/dashboard/stats")
    assert res2.status_code == 401


def test_admin_login_success(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vfn.com", "password": settings.ADMIN_PASSWORD},
    )
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body["admin"]["email"] == "admin@vfn.com"
    assert "access_token" in res.cookies


def test_admin_login_invalid_password(client: TestClient):
    client.cookies.clear()
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vfn.com", "password": "WrongPassword999!"},
    )
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_admin_login_nonexistent_email(client: TestClient):
    client.cookies.clear()
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@vfn.com", "password": "Password123!"},
    )
    assert res.status_code == 401


# -------------------------------------------------------------
# 3. Player Registration Tests
# -------------------------------------------------------------
def test_player_registration_success(client: TestClient, sync_mongo: MongoClient):
    sync_mongo[TEST_DB_NAME].players.delete_many({})
    sync_mongo[TEST_DB_NAME].counters.update_one(
        {"_id": "player_serial"}, {"$set": {"seq": 0}}, upsert=True
    )

    img_bytes = create_dummy_image_bytes()
    files = {"photo": ("player1.png", img_bytes, "image/png")}
    data = {
        "player_name": "Rohan Shetty",
        "village": "Nalthur",
        "playing_role": "Spiker",
        "phone_number": "9876543210",
    }

    res = client.post("/api/v1/players/register", data=data, files=files)
    assert res.status_code == 201
    body = res.json()
    assert body["serial_number"] == 1
    assert body["formatted_serial"] == "01"
    assert body["player_name"] == "Rohan Shetty"
    assert body["village"] == "Nalthur"
    assert body["playing_role"] == "Spiker"
    assert body["phone_number"] == "9876543210"
    assert body["poster_status"] == "pending"


def test_player_registration_missing_fields(client: TestClient):
    files = {"photo": ("test.png", create_dummy_image_bytes(), "image/png")}
    data = {
        "player_name": "Incomplete Player",
        "village": "Nalthur",
        "playing_role": "Setter",
    }
    res = client.post("/api/v1/players/register", data=data, files=files)
    assert res.status_code in [400, 422]


def test_player_registration_invalid_phone(client: TestClient):
    files = {"photo": ("test.png", create_dummy_image_bytes(), "image/png")}
    data = {
        "player_name": "Bad Phone Player",
        "village": "Nalthur",
        "playing_role": "Libero",
        "phone_number": "12345",
    }
    res = client.post("/api/v1/players/register", data=data, files=files)
    assert res.status_code in [400, 422]


def test_player_registration_invalid_image_type(client: TestClient):
    files = {"photo": ("document.txt", b"Hello text file content", "text/plain")}
    data = {
        "player_name": "Fake Image Player",
        "village": "Nalthur",
        "playing_role": "All-rounder",
        "phone_number": "9876543211",
    }
    res = client.post("/api/v1/players/register", data=data, files=files)
    assert res.status_code == 400
    assert "Invalid file type" in res.json()["detail"]


def test_sequential_serial_numbers(client: TestClient):
    """Verify consecutive registrations increment serial numbers sequentially without duplicates."""
    img = create_dummy_image_bytes()

    for expected_seq in range(2, 5):
        files = {"photo": (f"p{expected_seq}.png", img, "image/png")}
        data = {
            "player_name": f"Player Number {expected_seq}",
            "village": "Nalthur",
            "playing_role": "Setter",
            "phone_number": f"987654321{expected_seq}",
        }
        res = client.post("/api/v1/players/register", data=data, files=files)
        assert res.status_code == 201
        assert res.json()["serial_number"] == expected_seq
        assert res.json()["formatted_serial"] == f"{expected_seq:02d}"


# -------------------------------------------------------------
# 4. Player Management (Admin) Tests
# -------------------------------------------------------------
def test_player_list_pagination_and_search(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch all players
    res = client.get("/api/v1/players?page=1&page_size=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 4
    assert len(data["players"]) >= 4

    # Search by player name
    res_search = client.get("/api/v1/players?q=Rohan", headers=headers)
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1
    assert res_search.json()["players"][0]["player_name"] == "Rohan Shetty"

    # Search by serial number "1"
    res_serial = client.get("/api/v1/players?q=1", headers=headers)
    assert res_serial.status_code == 200
    assert res_serial.json()["total"] >= 1


def test_player_edit_preserves_serial(client: TestClient, admin_token: str, sync_mongo: MongoClient):
    headers = {"Authorization": f"Bearer {admin_token}"}

    player = sync_mongo[TEST_DB_NAME].players.find_one({"player_name": "Rohan Shetty"})
    assert player is not None
    p_id = str(player["_id"])
    original_serial = player["serial_number"]

    # Edit village and role
    update_res = client.patch(
        f"/api/v1/players/{p_id}",
        json={"village": "Nalthur Central", "playing_role": "Middle Blocker"},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["village"] == "Nalthur Central"
    assert updated["playing_role"] == "Middle Blocker"
    assert updated["serial_number"] == original_serial


def test_player_delete_authorized(client: TestClient, admin_token: str, sync_mongo: MongoClient):
    headers = {"Authorization": f"Bearer {admin_token}"}

    img = create_dummy_image_bytes()
    files = {"photo": ("del.png", img, "image/png")}
    data = {
        "player_name": "Temporary Player",
        "village": "Nalthur",
        "playing_role": "Other",
        "phone_number": "9812345678",
    }
    reg_res = client.post("/api/v1/players/register", data=data, files=files)
    del_id = reg_res.json()["id"]

    # Delete as admin
    del_res = client.delete(f"/api/v1/players/{del_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify document is deleted
    check_doc = sync_mongo[TEST_DB_NAME].players.find_one({"_id": del_id})
    assert check_doc is None


# -------------------------------------------------------------
# 5. Dashboard Stats Tests
# -------------------------------------------------------------
def test_dashboard_stats_real_aggregation(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/dashboard/stats", headers=headers)
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_registered_players"] >= 3
    assert stats["today_registrations"] >= 3
    assert "players_by_role" in stats
    assert "Middle Blocker" in stats["players_by_role"]
    assert stats["posters_pending"] >= 3
    assert "tournament_name" in stats


# -------------------------------------------------------------
# 6. Tournament Settings Tests
# -------------------------------------------------------------
def test_tournament_settings_get_and_update(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    get_res = client.get("/api/v1/tournament")
    assert get_res.status_code == 200
    assert "Volleyball Friends Nalthur" in get_res.json()["tournament_name"]

    patch_res = client.patch(
        "/api/v1/tournament",
        json={"ground": "Nalthur High School Ground", "year": 2026},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["ground"] == "Nalthur High School Ground"


# -------------------------------------------------------------
# 7. Dev Credentials & Backup System Tests
# -------------------------------------------------------------
def test_admin_login_with_username_admin(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_backup_create_status_history_restore(client: TestClient, admin_token: str):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Check status
    status_res = client.get("/api/v1/backup/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["system_status"] == "Operational (MongoDB Connected)"

    # 2. Create backup
    create_res = client.post("/api/v1/backup/create", headers=headers)
    assert create_res.status_code == 200
    backup_file = create_res.json()["filename"]
    assert backup_file.startswith("vfn_backup_")

    # 3. Check history
    hist_res = client.get("/api/v1/backup/history", headers=headers)
    assert hist_res.status_code == 200
    filenames = [item["filename"] for item in hist_res.json()]
    assert backup_file in filenames

    # 4. Download backup
    dl_res = client.get(f"/api/v1/backup/download/{backup_file}", headers=headers)
    assert dl_res.status_code == 200
    assert "players" in dl_res.json()

    # 5. Restore backup
    rst_res = client.post(f"/api/v1/backup/restore/{backup_file}", headers=headers)
    assert rst_res.status_code == 200
    assert rst_res.json()["success"] is True
