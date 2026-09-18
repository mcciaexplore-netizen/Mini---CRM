"""Indian festival and holiday calendar for 2025-2027."""
from datetime import date
from typing import List, Dict


FESTIVALS: List[Dict] = [
    # 2025
    {"date": date(2025, 1, 14), "name": "Makar Sankranti / Pongal", "type": "festival"},
    {"date": date(2025, 1, 26), "name": "Republic Day", "type": "national"},
    {"date": date(2025, 2, 26), "name": "Maha Shivratri", "type": "festival"},
    {"date": date(2025, 3, 14), "name": "Holi", "type": "festival"},
    {"date": date(2025, 3, 30), "name": "Gudi Padwa / Ugadi", "type": "festival"},
    {"date": date(2025, 4, 14), "name": "Ambedkar Jayanti", "type": "national"},
    {"date": date(2025, 4, 18), "name": "Good Friday", "type": "festival"},
    {"date": date(2025, 5, 12), "name": "Eid ul-Fitr", "type": "festival"},
    {"date": date(2025, 6, 7), "name": "Eid ul-Adha", "type": "festival"},
    {"date": date(2025, 8, 9), "name": "Muharram", "type": "festival"},
    {"date": date(2025, 8, 15), "name": "Independence Day", "type": "national"},
    {"date": date(2025, 8, 16), "name": "Janmashtami", "type": "festival"},
    {"date": date(2025, 8, 27), "name": "Ganesh Chaturthi", "type": "festival"},
    {"date": date(2025, 10, 2), "name": "Gandhi Jayanti", "type": "national"},
    {"date": date(2025, 10, 2), "name": "Navratri begins", "type": "festival"},
    {"date": date(2025, 10, 12), "name": "Dussehra", "type": "festival"},
    {"date": date(2025, 10, 20), "name": "Milad-un-Nabi", "type": "festival"},
    {"date": date(2025, 10, 20), "name": "Diwali", "type": "festival"},
    {"date": date(2025, 10, 22), "name": "Bhai Dooj", "type": "festival"},
    {"date": date(2025, 11, 5), "name": "Chhath Puja", "type": "festival"},
    {"date": date(2025, 11, 15), "name": "Guru Nanak Jayanti", "type": "festival"},
    {"date": date(2025, 12, 25), "name": "Christmas", "type": "festival"},
    # 2026
    {"date": date(2026, 1, 14), "name": "Makar Sankranti", "type": "festival"},
    {"date": date(2026, 1, 26), "name": "Republic Day", "type": "national"},
    {"date": date(2026, 2, 15), "name": "Maha Shivratri", "type": "festival"},
    {"date": date(2026, 3, 4), "name": "Holi", "type": "festival"},
    {"date": date(2026, 3, 19), "name": "Gudi Padwa / Ugadi", "type": "festival"},
    {"date": date(2026, 4, 14), "name": "Ambedkar Jayanti", "type": "national"},
    {"date": date(2026, 4, 3), "name": "Good Friday", "type": "festival"},
    {"date": date(2026, 3, 31), "name": "Eid ul-Fitr", "type": "festival"},
    {"date": date(2026, 6, 27), "name": "Eid ul-Adha", "type": "festival"},
    {"date": date(2026, 8, 15), "name": "Independence Day", "type": "national"},
    {"date": date(2026, 9, 4), "name": "Janmashtami", "type": "festival"},
    {"date": date(2026, 9, 16), "name": "Ganesh Chaturthi", "type": "festival"},
    {"date": date(2026, 10, 2), "name": "Gandhi Jayanti", "type": "national"},
    {"date": date(2026, 10, 22), "name": "Navratri begins", "type": "festival"},
    {"date": date(2026, 11, 1), "name": "Dussehra", "type": "festival"},
    {"date": date(2026, 11, 8), "name": "Diwali", "type": "festival"},
    {"date": date(2026, 12, 25), "name": "Christmas", "type": "festival"},
    # 2027
    {"date": date(2027, 1, 14), "name": "Makar Sankranti", "type": "festival"},
    {"date": date(2027, 1, 26), "name": "Republic Day", "type": "national"},
    {"date": date(2027, 3, 22), "name": "Holi", "type": "festival"},
    {"date": date(2027, 8, 15), "name": "Independence Day", "type": "national"},
    {"date": date(2027, 10, 2), "name": "Gandhi Jayanti", "type": "national"},
    {"date": date(2027, 10, 29), "name": "Diwali", "type": "festival"},
    {"date": date(2027, 12, 25), "name": "Christmas", "type": "festival"},
]


def get_festivals_in_range(start: date, end: date) -> List[Dict]:
    """Return festivals between start and end dates (inclusive)."""
    return [
        {"date": f["date"].isoformat(), "name": f["name"], "type": f["type"]}
        for f in FESTIVALS
        if start <= f["date"] <= end
    ]
