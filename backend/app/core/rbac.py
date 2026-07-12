from typing import List
from fastapi import Depends, HTTPException, status

from app.core.enums import UserRole
from app.models.user import User


# Current User Dependency Skeleton
# (This stub will be replaced by Member 1's actual JWT current-user retrieval)
async def get_current_user() -> User:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="JWT Authentication / get_current_user dependency not implemented yet by Member 1."
    )


# Role-Based Access Control (RBAC) Checker Dependency
class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have the required permissions to perform this action."
            )
        return current_user


# Role Authorization Dependencies
require_admin = RoleChecker([UserRole.ADMIN])
require_asset_manager = RoleChecker([UserRole.ADMIN, UserRole.ASSET_MANAGER])
require_department_head = RoleChecker([UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD])
require_employee = RoleChecker([
    UserRole.ADMIN,
    UserRole.ASSET_MANAGER,
    UserRole.DEPARTMENT_HEAD,
    UserRole.EMPLOYEE,
])
