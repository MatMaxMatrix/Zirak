"""
async_runner.py — Persistent asyncio event loop for Zirak.

All async operations (MCP SSE connections, LLM_Agent chat) MUST run in
the same event loop to avoid anyio cancel-scope conflicts.  This module
provides a single loop running forever in a daemon thread, plus helpers
that submit work to it from synchronous callers (e.g. eventlet greenlets
inside Flask-SocketIO, or startup code in the main thread).
"""

import asyncio
import logging
import threading

logger = logging.getLogger(__name__)

_loop: asyncio.AbstractEventLoop | None = None
_thread: threading.Thread | None = None
_lock = threading.Lock()


def _ensure_loop() -> asyncio.AbstractEventLoop:
    """Return the shared event loop, creating and starting it if necessary."""
    global _loop, _thread
    with _lock:
        if _loop is None or not _loop.is_running():
            _loop = asyncio.new_event_loop()
            _thread = threading.Thread(
                target=_loop.run_forever,
                daemon=True,
                name="zirak-async",
            )
            _thread.start()
            logger.info("Persistent async event loop started (thread: zirak-async)")
    return _loop


def run_async(coro, timeout: float | None = None):
    """
    Submit *coro* to the persistent event loop and block the caller until done.

    Safe to call from any thread that is NOT already running the persistent loop
    (i.e. the main thread or an eventlet greenlet).  Do NOT call this from inside
    a coroutine that is already running on the persistent loop — it will deadlock.
    """
    loop = _ensure_loop()
    future = asyncio.run_coroutine_threadsafe(coro, loop)
    return future.result(timeout=timeout)


def start_mcp_manager(server_url: str) -> None:
    """
    Create the MCPManager singleton and schedule its worker task.

    Uses loop.call_soon_threadsafe() so this is safe to call from the main
    thread (startup code) regardless of whether the loop is idle or busy.
    The actual MCP SSE connection is established asynchronously; callers that
    need to wait for readiness should use `await manager.wait_ready()`.
    """
    from .mcp_manager import get_mcp_manager

    loop = _ensure_loop()
    manager = get_mcp_manager(server_url)

    # schedule start() to run inside the loop thread so create_task() works
    loop.call_soon_threadsafe(_start_manager_task, manager, loop)
    logger.info("MCPManager worker task scheduled via call_soon_threadsafe.")


def _start_manager_task(manager, loop: asyncio.AbstractEventLoop) -> None:
    """Called inside the loop thread — safe to call create_task here."""
    if manager._task is None or manager._task.done():
        manager._task = loop.create_task(manager._worker(), name="mcp-conn-worker")
        logger.info("MCPManager worker task created.")


# Start the loop immediately on import so it is ready before the first request.
_ensure_loop()
