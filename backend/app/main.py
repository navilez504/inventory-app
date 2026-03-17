import logging
import time
from logging.config import dictConfig

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from starlette.middleware.cors import CORSMiddleware

from .api.routers import (
    assignments as assignments_router,
    assets as assets_router,
    audit as audit_router,
    auth as auth_router,
    master_data as master_data_router,
    movements as movements_router,
    org as org_router,
    reports as reports_router,
    roles as roles_router,
    stock as stock_router,
    users as users_router,
    warehouses as warehouses_router,
)
from .core.config import Settings, get_settings
from .core.logging_config import get_logging_config
from .core.security import get_current_active_user
from .database.database import Base, engine, SessionLocal
from .schemas import User as UserSchema
from .utils.seed import seed_initial_data


dictConfig(get_logging_config())
logger = logging.getLogger("inventory")

settings: Settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error", extra={"errors": exc.errors(), "path": request.url.path})
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error", extra={"path": request.url.path})
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def startup_seed():
    # Ensure DB is ready and tables exist before seeding
    max_retries = 10
    delay_seconds = 3

    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Initializing database (attempt %s/%s)", attempt, max_retries)
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                seed_initial_data(db)
            finally:
                db.close()
            logger.info("Database initialization and seeding completed")
            break
        except OperationalError as exc:
            logger.warning(
                "Database not ready yet (%s). Retrying in %s seconds...",
                exc,
                delay_seconds,
            )
            time.sleep(delay_seconds)
        except Exception:
            logger.exception("Unexpected error during startup initialization")
            # Do not crash the app; just log. Migrations or manual fixes may be needed.
            break


@app.get("/me", tags=["auth"], response_model=UserSchema)
def read_current_user(current_user=Depends(get_current_active_user)):
    return current_user


app.include_router(auth_router.router, prefix="/auth")
app.include_router(users_router.router, prefix="/users")
app.include_router(roles_router.router, prefix="/roles")
app.include_router(org_router.router, prefix="/org")
app.include_router(assets_router.router, prefix="/assets")
app.include_router(warehouses_router.router, prefix="/warehouses")
app.include_router(movements_router.router, prefix="/movements")
app.include_router(audit_router.router, prefix="/audit")
app.include_router(assignments_router.router, prefix="/assignments")
app.include_router(stock_router.router, prefix="/stock")
app.include_router(master_data_router.router, prefix="/master-data")
app.include_router(reports_router.router, prefix="/reports")
