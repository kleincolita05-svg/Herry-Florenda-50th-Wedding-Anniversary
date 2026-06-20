# Wedding QR Check-in Starter

A free offline-capable web app/PWA for wedding anniversary guest check-in.

## What this app does

- Shows a branded wedding dashboard
- Displays event title and celebrants photo
- Imports guest list from CSV
- Scans guest QR codes using the browser camera
- Shows assigned table instantly
- Marks guests as checked in
- Warns if a guest is already checked in
- Shows table-by-table guest status
- Works offline after it is loaded and cached
- Exports check-in results as CSV

## CSV format

Use this exact header format:

GuestID,GuestName,TableNumber,TableName,GuestType,Notes

Example:

WED-G001,Juan Dela Cruz,01,Table 01,Regular,
WED-G003,Hon. Roberto Reyes,P1,Presidential Table 1,Presidential,Escort personally

## Important browser note

This starter uses the browser's native BarcodeDetector API for QR scanning.

Best devices:
- Android phone using Chrome
- Android tablet using Chrome
- Laptop using Chrome or Edge with camera

If the browser does not support native QR scanning, use Manual Search as backup.

## Offline checklist

1. Host the app on HTTPS, for example GitHub Pages.
2. Open the app on each coordinator device while online.
3. Import the final CSV guest list.
4. Start the scanner and allow camera permission.
5. Confirm the app status says Secure camera context.
6. Turn on airplane mode.
7. Refresh/open the app again.
8. Test scan and manual search.
9. Export test CSV.
10. Reset check-ins before the actual event starts.

## Replace the celebrants photo

Replace this file:

assets/couple-placeholder.svg

with the actual couple photo.

Recommended:
- Use JPG or PNG
- Rename it to couple-photo.jpg
- Update index.html image path:
  ./assets/couple-photo.jpg

## Generate QR codes

Each QR should contain only the GuestID.

Example:
- WED-G001
- WED-G002
- WED-G003

Do not encode table numbers directly into the QR code.

## Generate printable QR codes with Python

Run:

python qr-generator.py guests.csv

This creates QR code PNG files inside:

generated-qrs/

Requires Python package:
pip install qrcode[pil]

