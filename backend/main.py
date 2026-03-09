"""FastAPI app entry. Thin: mount app and include routers."""

from fastapi import FastAPI

from app.api.routes import chat, dashboard, engineers, network

app = FastAPI(
    title="Engineering Impact API",
    description="Dashboard, engineers, network, chat. File-based data.",
    version="0.1.0",
)

app.include_router(dashboard.router)
app.include_router(engineers.router)
app.include_router(network.router)
app.include_router(chat.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
