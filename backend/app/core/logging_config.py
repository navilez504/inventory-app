from .config import get_settings


def get_logging_config():
    settings = get_settings()
    level = "DEBUG" if settings.DEBUG else "INFO"
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s [%(levelname)s] %(name)s - %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            },
        },
        "loggers": {
            "uvicorn": {"handlers": ["console"], "level": level},
            "uvicorn.error": {"handlers": ["console"], "level": level},
            "uvicorn.access": {"handlers": ["console"], "level": level},
            "inventory": {"handlers": ["console"], "level": level},
        },
    }

