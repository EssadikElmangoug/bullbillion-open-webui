import os
import sys
import sqlite3
from datetime import datetime

# Create the database directory if it doesn't exist
os.makedirs('data', exist_ok=True)

# Connect to the database
conn = sqlite3.connect('data/webui.db')
cursor = conn.cursor()

# Create the config table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY,
    data JSON NOT NULL,
    version INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
)
''')

# Check if the config table is empty
cursor.execute('SELECT COUNT(*) FROM config')
count = cursor.fetchone()[0]

# If the table is empty, insert default config
if count == 0:
    default_config = '{}'
    cursor.execute(
        'INSERT INTO config (data, version) VALUES (?, ?)',
        (default_config, 0)
    )

# Commit the changes and close the connection
conn.commit()
conn.close()

print("Database initialized successfully")
