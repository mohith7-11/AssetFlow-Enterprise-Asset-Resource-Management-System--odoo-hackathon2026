from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    ASSET_MANAGER = "ASSET_MANAGER"
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD"
    EMPLOYEE = "EMPLOYEE"


class RecordStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class AssetStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ALLOCATED = "ALLOCATED"
    RESERVED = "RESERVED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
    LOST = "LOST"
    RETIRED = "RETIRED"
    DISPOSED = "DISPOSED"


class AssetCondition(str, Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    FAIR = "FAIR"
    DAMAGED = "DAMAGED"