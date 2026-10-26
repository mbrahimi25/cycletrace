import sqlite3
from datetime import datetime

DB_PATH = "bike_tracker.db"

connection = sqlite3.connect(DB_PATH)
cursor = connection.cursor()

# Create a trip
cursor.execute("""
INSERT INTO trips (start_time)
VALUES (?)
""", (datetime.now().isoformat(),))

trip_id = cursor.lastrowid

print("Created trip:", trip_id)

# Add a GPS point
cursor.execute("""
INSERT INTO gps_points
(trip_id, timestamp, latitude, longitude, speed)
VALUES (?, ?, ?, ?, ?)
""", (
    trip_id,
    datetime.now().isoformat(),
    43.7615,
    -79.4111,
    12.5
))

connection.commit()
connection.close()

print("GPS point saved.")