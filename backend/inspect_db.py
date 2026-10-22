from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
for db_name in client.list_database_names():
    db = client[db_name]
    for col_name in db.list_collection_names():
        try:
            doc = db[col_name].find_one({'player_name': {'$exists': True}})
            if doc:
                cnt = db[col_name].count_documents({})
                print(f"{db_name}.{col_name}: found player '{doc.get('player_name')}', total count: {cnt}")
                for p in db[col_name].find().limit(5):
                    print(f"   -> #{p.get('serial_number')}: {p.get('player_name')} | poster_url: {p.get('poster_url')}")
        except Exception as e:
            pass
