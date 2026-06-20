import csv
import os
import sys
from pathlib import Path

try:
    import qrcode
except ImportError:
    print("Missing package. Run: pip install qrcode[pil]")
    raise

def safe_filename(value):
    return "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in value)

def main():
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("guests.csv")
    if not csv_path.exists():
        print(f"CSV file not found: {csv_path}")
        return

    out_dir = Path("generated-qrs")
    out_dir.mkdir(exist_ok=True)

    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if "GuestID" not in reader.fieldnames:
            print("CSV must contain GuestID header.")
            return

        count = 0
        for row in reader:
            guest_id = (row.get("GuestID") or "").strip()
            guest_name = (row.get("GuestName") or "").strip()
            if not guest_id:
                continue

            img = qrcode.make(guest_id)
            filename = f"{safe_filename(guest_id)}-{safe_filename(guest_name)}.png" if guest_name else f"{safe_filename(guest_id)}.png"
            img.save(out_dir / filename)
            count += 1

    print(f"Generated {count} QR codes in {out_dir}/")

if __name__ == "__main__":
    main()
