
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import sqlite3
import json
import os

DATABASE = os.path.join(os.path.dirname(__file__), "pcards.db")

PROHIBITED_KEYWORDS = {
    "Alcohol": ["alcohol", "beer", "wine", "liquor", "spirits"],
    "Cash/ATM": ["atm", "cash advance", "cash withdrawal"],
    "Decorations": ["decoration", "decorations", "balloon", "ornament"],
    "Donations/Sponsorships": ["donation", "donations", "sponsorship"],
    "Gasoline": ["gasoline", "fuel", "petrol", "gas station"],
    "Gifts": ["gift", "gifts", "gift card", "gift cards"],
    "Insurance": ["insurance", "insurance premium"],
    "Late Fees": ["late fee", "late fees", "penalty fee"],
    "Mail/Postage": ["postage", "stamps", "mailing", "shipping label"],
    "Moving": ["moving service", "moving company", "relocation"],
    "Personal Purchases": ["personal purchase", "personal use"],
    "Memberships": ["membership", "membership fee", "club dues"],
    "Wages/Benefits": ["wages", "payroll", "employee benefit"],
    "Service/Incentive Awards": [
        "service award", "incentive award", "employee award"
    ]
}


def identify_category(vendor, description):
    text = f"{vendor or ''} {description or ''}".lower()

    for category, keywords in PROHIBITED_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                return category

    return "Not flagged"


class PCardHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/search":
            params = parse_qs(parsed.query)
            year = params.get("year", ["2014"])[0]
            vendor = params.get("vendor", [""])[0]
            description = params.get("description", [""])[0]

            try:
                year = int(year)
                if not 2000 <= year <= 2100:
                    raise ValueError("Invalid year")

                connection = sqlite3.connect(DATABASE)
                connection.row_factory = sqlite3.Row

                sql = """
                    SELECT FullName, TransactionDate, Vendor,
                           Description, Amount, Year
                    FROM pcards
                    WHERE Year = ?
  AND COALESCE(Vendor, '') LIKE ?
  AND COALESCE(Description, '') LIKE ?
                """

                rows = connection.execute(
                    sql,
                    (year, "%" + vendor + "%", "%" + description + "%")
                ).fetchall()

                connection.close()

                result = []

                for row in rows:
                    transaction = dict(row)
                    transaction["Category"] = identify_category(
                        transaction.get("Vendor"),
                        transaction.get("Description")
                    )
                    result.append(transaction)

                body = json.dumps(result, default=str).encode("utf-8")

                self.send_response(200)
                self.send_header(
                    "Content-Type", "application/json; charset=utf-8"
                )
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            except Exception as error:
                body = json.dumps({"error": str(error)}).encode("utf-8")
                self.send_response(500)
                self.send_header(
                    "Content-Type", "application/json; charset=utf-8"
                )
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        else:
            super().do_GET()


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8000), PCardHandler)
    print("Website running at http://127.0.0.1:8000")
    print("Press Control+C to stop the server.")
    server.serve_forever()
