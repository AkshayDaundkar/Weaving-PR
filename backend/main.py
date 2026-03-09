"""FastAPI app entry: lifespan, CORS, routes, GET / manifest."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, dashboard, engineers, network


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown hooks."""
    yield


app = FastAPI(
    title="Engineering Impact API",
    description="Dashboard, engineers, network, chat. File-based data.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(engineers.router)
app.include_router(network.router)
app.include_router(chat.router)


@app.get("/")
def root() -> dict:
    """API manifest: entrypoint and available routes."""
    return {
        "name": "Engineering Impact API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "routes": [
            "GET /api/dashboard",
            "GET /api/engineers",
            "GET /api/engineers/top",
            "GET /api/engineers/{login}",
            "GET /api/network",
            "POST /api/chat",
        ],
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
