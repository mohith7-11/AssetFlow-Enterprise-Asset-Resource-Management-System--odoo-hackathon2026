from sqlalchemy import text
from app.db.base import Base
from app.db.session import engine

import app.models  # noqa: F401


def init_db() -> None:
    # 1. Enable btree_gist extension (required for EXCLUDE constraints on non-geometric types)
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist;"))

    # 2. Create standard SQLAlchemy tables
    Base.metadata.create_all(bind=engine)

    # 3. Custom Postgres Constraints Hook
    # When Module B (assets/allocation) or Module C (booking) are implemented,
    # owners should execute their custom raw SQL CREATE UNIQUE INDEX or EXCLUDE constraints here.
    # Example:
    # with engine.begin() as connection:
    #     connection.execute(text("ALTER TABLE bookings ADD CONSTRAINT exclude_overlapping_bookings EXCLUDE USING gist (...);"))