from time import sleep, time
import adafruit_character_lcd.character_lcd as characterlcd
import digitalio
import board
from gpiozero import Button
import gps

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

# Button
button = Button(16)

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

# Start with a message
lcd.clear()
lcd.message = "Waiting for GPS"

# Keep track of the last GPS position
latitude = None
longitude = None

# Last time LCD was updated
last_update = 0

while True:

    # Get the next GPS report
    report = session.next()

    # Only care about TPV reports
    if report["class"] == "TPV":

        if hasattr(report, "lat") and hasattr(report, "lon"):

            # Make sure coordinates actually contain values
            if report.lat is not None and report.lon is not None:

                latitude = report.lat
                longitude = report.lon

                # Print to terminal
                print(f"Latitude: {latitude}")
                print(f"Longitude: {longitude}")

                # Update LCD every 3 seconds
                if time() - last_update >= 3:

                    line1 = f"Lat:{latitude:.6f}"
                    line2 = f"Lon:{longitude:.6f}"

                    # Clear and display
                    lcd.clear()
                    lcd.message = line1 + "\n" + line2

                    last_update = time()

    sleep(0.1)