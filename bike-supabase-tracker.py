from time import sleep, time
from datetime import datetime
from pathlib import Path
import socket
import sqlite3

import adafruit_character_lcd.character_lcd as characterlcd

import digitalio
import board
from gpiozero import Button

import gps
import requests
from dotenv import load_dotenv
import os

# Load configuration from the .env beside this script.
load_dotenv(Path(__file__).with_name(".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
# Use a Supabase publishable/anon key with an appropriate INSERT policy.
# Do not put a service_role key on the Raspberry Pi.
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_TIMEOUT_SECONDS = 10
SYNC_INTERVAL_SECONDS = 30
INTERNET_CHECK_HOST = "1.1.1.1"
INTERNET_CHECK_PORT = 53

# LCD dimensions
lcd_columns = 16
lcd_rows = 2

# LCD GPIO pins
lcd_rs = digitalio.DigitalInOut(board.D5)
lcd_en = digitalio.DigitalInOut(board.D6)
lcd_d4 = digitalio.DigitalInOut(board.D13)
lcd_d5 = digitalio.DigitalInOut(board.D19)
lcd_d6 = digitalio.DigitalInOut(board.D26)
lcd_d7 = digitalio.DigitalInOut(board.D21)

# Initialize LCD
lcd = characterlcd.Character_LCD_Mono(
    lcd_rs,
    lcd_en,
    lcd_d4,
    lcd_d5,
    lcd_d6,
    lcd_d7,
    lcd_columns,
    lcd_rows
)

# Initialize GPS
session = gps.gps(mode=gps.WATCH_ENABLE | gps.WATCH_NEWSTYLE)
report = session.next()

# Initialize DB
DB_PATH = "bike_tracker.db"


def create_trip(start_time):
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO trips (start_time, synced)
        VALUES (?, 0)
    """, (start_time,))

    trip_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return trip_id


def add_gps_point(trip_id, timestamp, lat, lon, speed):
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO gps_points
        (trip_id, timestamp, latitude, longitude, speed, synced)
        VALUES (?, ?, ?, ?, ?, 0)
    """, (
        trip_id,
        timestamp,
        lat,
        lon,
        speed
    ))

    connection.commit()
    connection.close()


def has_internet_connection():
    """Return whether an outbound network connection can be established."""
    try:
        with socket.create_connection(
            (INTERNET_CHECK_HOST, INTERNET_CHECK_PORT), timeout=3
        ):
            return True
    except OSError:
        return False


def sync_table(table_name):
    """Upload unsynced rows and mark each local row only after success."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase configuration is missing; skipping sync.")
        return

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            f'SELECT * FROM "{table_name}" WHERE synced = 0 ORDER BY id'
        ).fetchall()

        endpoint = f"{SUPABASE_URL}/rest/v1/{table_name}"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            # Upsert on the local primary key so a retry cannot duplicate rows.
            "Prefer": "resolution=merge-duplicates,return=minimal",
        }

        for row in rows:
            row_data = dict(row)
            row_id = row_data["id"]
            # synced is local queue state, so it is not sent to Supabase.
            row_data.pop("synced", None)

            response = requests.post(
                f"{endpoint}?on_conflict=id",
                headers=headers,
                json=row_data,
                timeout=SUPABASE_TIMEOUT_SECONDS,
            )
            response.raise_for_status()

            connection.execute(
                f'UPDATE "{table_name}" SET synced = 1 WHERE id = ?',
                (row_id,),
            )
            connection.commit()
            print(f"Synced {table_name} row # {row_id}")
    except (sqlite3.Error, requests.RequestException, KeyError) as error:
        print(f"Could not sync {table_name}: {error}")
    finally:
        connection.close()


def sync_pending_rows():
    """Sync parent trips before their GPS points."""
    if not has_internet_connection():
        return

    sync_table("trips")
    sync_table("gps_points")


# Initialize button and trips
trip_ongoing = False
current_trip = 0

button = Button(16)


def toggle_trip():
    global trip_ongoing
    global current_trip
    global lcd

    if trip_ongoing == False:
        trip_ongoing = True
        current_trip = create_trip(datetime.now().isoformat())
        print("Created trip #", current_trip)

    elif trip_ongoing == True:
        trip_ongoing = False

    lcd.clear()
    lcd.message = str(trip_ongoing) + "\n" + "Trip #" + str(current_trip)


button.when_released = toggle_trip


# Start with a message
lcd.clear()
lcd.message = "Waiting..."
last_sync_check = 0

while True:

    # Get the next GPS report
    report = session.next()

    if trip_ongoing:
        # Save GPS coords
        if report["class"] == "TPV":
            if hasattr(report, "lat") and hasattr(report, "lon") and hasattr(report, "time") and hasattr(report, "speed"):

                add_gps_point(current_trip, report.time, report.lat, report.lon, report.speed)

                print("Inserted coord at ", datetime.now().isoformat())

    if time() - last_sync_check >= SYNC_INTERVAL_SECONDS:
        sync_pending_rows()
        last_sync_check = time()

    sleep(1)
