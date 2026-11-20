import asyncio
from backend.app.core.database import connect_to_mongo, close_mongo_connection, get_database

async def check_player1():
    await connect_to_mongo()
    db = await get_database()
    c_url = 'https://res.cloudinary.com/wcajcjoc/image/upload/v1795137714/vfn_tournament_2026/posters/poster_01_Jeevan.png'
    c_id = 'vfn_tournament_2026/posters/poster_01_Jeevan'
    rel_url = '/uploads/posters/poster_01_JEEVAN_6ada2eaa.png'
    res = await db.players.update_one(
        {'serial_number': 1},
        {'$set': {'poster_url': c_url, 'poster_public_id': c_id, 'local_poster_path': rel_url, 'poster_status': 'generated'}}
    )
    print('Updated count:', res.modified_count)
    p = await db.players.find_one({'serial_number': 1})
    print('Player 1 poster_url:', p.get('poster_url'))
    await close_mongo_connection()

if __name__ == '__main__':
    asyncio.run(check_player1())
