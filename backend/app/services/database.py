import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).resolve().parent.parent.parent / "voice_life.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_connection()
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            text TEXT NOT NULL,
            person TEXT,
            place TEXT,
            date TEXT,
            time TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    connection.commit()
    connection.close()
