# API Configurations
API_V1_STR: str = "/api/v1"
PROJECT_NAME: str = "AssetFlow"

# Pagination Defaults
DEFAULT_PAGE_SIZE: int = 20
MAX_PAGE_SIZE: int = 100

# Security Configurations (Standard JWT Defaults)
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

# Database Constraint Names (For custom migrations / raw SQL hooks)
CONSTRAINT_DOUBLE_ALLOCATION_NAME = "uq_active_asset_allocation"
CONSTRAINT_OVERLAPPING_BOOKINGS_NAME = "exclude_overlapping_bookings"
