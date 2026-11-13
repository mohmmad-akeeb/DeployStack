from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import (
    LoginRequest,
    TokenResponse,
    UserChangePasswordRequest,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New User Account",
    description="Registers a new team member with enterprise password complexity checks.",
)
def register(
    payload: UserRegisterRequest,
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    auth_service = AuthService(db)
    user = auth_service.register_user(payload)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate User and Obtain JWT",
    description="Validates user credentials and issues a signed stateless JWT token.",
)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    auth_service = AuthService(db)
    token, user = auth_service.authenticate_user(
        email=payload.email,
        password=payload.password,
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User Profile",
    description="Retrieves profile metadata for the authenticated caller.",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.put(
    "/profile",
    response_model=UserResponse,
    summary="Update Profile",
    description="Updates user display name and avatar URL.",
)
def update_profile(
    payload: UserProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    auth_service = AuthService(db)
    updated_user = auth_service.update_profile(
        user=current_user,
        full_name=payload.full_name,
        avatar_url=payload.avatar_url,
    )
    return UserResponse.model_validate(updated_user)


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change Password",
    description="Changes password after validating the existing password.",
)
def change_password(
    payload: UserChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    auth_service = AuthService(db)
    auth_service.change_password(
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return MessageResponse(
        message="Password changed successfully",
        detail=None,
    )
