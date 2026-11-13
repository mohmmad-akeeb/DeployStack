from fastapi import APIRouter

from app.api.v1.endpoints import attachments, auth, dashboard, health, projects, tasks

api_router = APIRouter()

# Health probe mounted at /health
api_router.include_router(health.router, tags=["Health"])

# Domain subsystem routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(attachments.router, prefix="/attachments", tags=["Attachments"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
