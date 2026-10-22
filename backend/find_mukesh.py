from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb://localhost:27017')
target_id = ObjectId('6ad96088e16801ec7d979fd5')

found = False
for db_name in client.list_database_names():
    db = client[db_name]
    for col_name in db.list_collection_names():
        try:
            doc = db[col_name].find_one({'_id': target_id})
            if doc:
                print(f"FOUND IN {db_name}.{col_name}: {doc}")
                found = True
        except:
            pass

if not found:
    print("Not found by ID, searching by string 'MUKESH'...")
    for db_name in client.list_database_names():
        db = client[db_name]
        for col_name in db.list_collection_names():
            try:
                for d in db[col_name].find():
                    if 'MUKESH' in str(d) or 'Mukesh' in str(d):
                        print(f"Found Mukesh in {db_name}.{col_name}: {d}")
            except:
                pass
