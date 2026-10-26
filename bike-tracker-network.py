# Date, time, and sleep
from time import sleep, time
from datetime import datetime, timezone

# Library for LCD control
import adafruit_character_lcd.character_lcd as characterlcd

# Libraries for GPIO pins and pushbutton
import digitalio
import board
from gpiozero import Button

# GPS Library
import gps

# SQLite Library
import sqlite3

# Communicates with cloud database, and checks for internet connection
import requests

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

# Creates a trip and inserts it into trips table with the start time
def create_trip(start_time):
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO trips (start_time)
        VALUES (?)
    """, (start_time,))

    trip_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return trip_id

# Adds a GPS Point to the gps_points table with the current trip_id, current time, latitude, longitude, and speed
def add_gps_point(trip_id, timestamp, lat, lon, speed):

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO gps_points
        (trip_id, timestamp, latitude, longitude, speed)
        VALUES (?, ?, ?, ?, ?)
    """, (
        trip_id,
        timestamp,
        lat,
        lon,
        speed
    ))

    connection.commit()
    connection.close()

# Initialize button and trips
trip_ongoing = False
current_trip = 0
button = Button(16)

# Function to start/stop a trip
def toggle_trip():
    global trip_ongoing
    global current_trip
    global lcd

    if trip_ongoing == False:
        trip_ongoing = True
        current_trip = create_trip(datetime.now(timezone.utc).isoformat())
        print("Created trip #", current_trip)

    elif trip_ongoing == True:
        trip_ongoing = False

    lcd.clear()
    lcd.message = str(trip_ongoing) + "\n" + "Trip #" + str(current_trip)

# Trips are started/stopped when button is RELEASED
button.when_released = toggle_trip

# Start with a message
lcd.clear()
lcd.message = "Waiting..."

while True:

    # Get the next GPS report
    report = session.next()

    if trip_ongoing:
        # Save GPS coords
        if report["class"] == "TPV":
            if hasattr(report, "lat") and hasattr(report, "lon") and hasattr(report, "time") and hasattr(report, "speed"):

                add_gps_point(current_trip, report.time, report.lat, report.lon, report.speed)

                print("Inserted coord at ", datetime.now(timezone.utc).isoformat())

    sleep(1)