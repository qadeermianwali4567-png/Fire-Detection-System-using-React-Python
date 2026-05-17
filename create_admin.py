import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta, timezone

async def create_admin():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['fire_detection_db']
    pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')

    # Check if admin already exists
    existing = await db.admins.find_one({'username': 'admin'})
    if existing:
        print('Admin already exists!')
        client.close()
        return

    await db.admins.insert_one({
        'username':        'admin',
        'email':           'admin@fire.com',
        'hashed_password': pwd.hash('admin123'),
        'is_active':       True,
        'created_at':      datetime.now(timezone.utc),
    })

    print('Admin created successfully!')
    print('Username: admin')
    print('Password: admin123')
    client.close()

asyncio.run(create_admin())