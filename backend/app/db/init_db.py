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
    with engine.begin() as connection:
        # Create unique index to block duplicate active allocations (double-allocation)
        connection.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS one_active_allocation
            ON allocations (asset_id) WHERE status = 'ACTIVE';
        """))

        # Create range-exclusion constraint to block overlapping bookings
        # We query conname first to prevent duplicate alter table failures on subsequent startups
        constraint_exists = connection.execute(text("""
            SELECT 1 FROM pg_constraint WHERE conname = 'no_overlap';
        """)).scalar()

        if not constraint_exists:
            connection.execute(text("""
                ALTER TABLE bookings ADD CONSTRAINT no_overlap
                EXCLUDE USING gist (
                  asset_id WITH =,
                  tstzrange(start_time, end_time, '[)') WITH &&
                ) WHERE (status <> 'CANCELLED');
            """))