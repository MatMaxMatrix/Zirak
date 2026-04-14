"""
mcp_manager.py — Persistent MCP connection owner.

anyio's task-group cancel scopes are strictly task-bound: the context
manager that enters a scope MUST exit it from the same task.  The
sse_client() async context manager uses such a scope internally.

If we open/close the MCP session from multiple coroutines (or from a
fresh asyncio.run() call) the cancel scope is entered in one task and
Python's GC / asyncio tries to exit it from another → RuntimeError.

Fix: run one long-lived asyncio.Task that opens sse_client, keeps it
open for the entire app lifetime, and serves list_tools / call_tool
requests forwarded via asyncio.Queue.  The cancel scope never crosses
task boundaries.
"""

import asyncio
import logging
import uuid
from contextlib import AsyncExitStack
from typing import Any, Dict, List, Optional

from mcp import ClientSession
from mcp.client.sse import sse_client

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Public interface (called from LLM_Agent)
# --------------------------------------------------------------------------- #

class MCPManager:
    """Manages a single persistent MCP SSE connection via a dedicated task."""

    def __init__(self, server_url: str):
        self.server_url = server_url
        self._ready: asyncio.Event = asyncio.Event()
        self._queue: asyncio.Queue = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None
        self._tools: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------ #
    # Startup
    # ------------------------------------------------------------------ #

    def start(self) -> None:
        """
        Schedule the worker task.  Must be called from inside the running loop
        (i.e. via loop.call_soon_threadsafe or from a coroutine on that loop).
        async_runner._start_manager_task() is the intended caller.
        """
        loop = asyncio.get_running_loop()
        self._task = loop.create_task(self._worker(), name="mcp-conn-worker")
        logger.info("MCPManager worker task created.")

    # ------------------------------------------------------------------ #
    # Public async API (safe to call from ANY coroutine in the same loop)
    # ------------------------------------------------------------------ #

    async def wait_ready(self, timeout: float = 30.0) -> bool:
        """Block until the MCP connection is established (or timeout)."""
        try:
            await asyncio.wait_for(self._ready.wait(), timeout=timeout)
            return True
        except asyncio.TimeoutError:
            logger.error("MCPManager: timed out waiting for connection.")
            return False

    async def list_tools(self) -> Any:
        """Forward list_tools() to the worker task."""
        return await self._dispatch("list_tools", {})

    async def call_tool(self, name: str, arguments: dict) -> Any:
        """Forward call_tool() to the worker task."""
        return await self._dispatch("call_tool", {"name": name, "arguments": arguments})

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    async def _dispatch(self, op: str, args: dict) -> Any:
        await self._ready.wait()
        loop = asyncio.get_event_loop()
        future: asyncio.Future = loop.create_future()
        await self._queue.put((op, args, future))
        return await future

    async def _worker(self) -> None:
        """Long-lived task: owns the sse_client context from open to close."""
        while True:
            try:
                logger.info(f"MCPManager: connecting to {self.server_url}…")
                async with AsyncExitStack() as stack:
                    streams = await stack.enter_async_context(
                        sse_client(self.server_url)
                    )
                    session: ClientSession = await stack.enter_async_context(
                        ClientSession(streams[0], streams[1])
                    )
                    await session.initialize()
                    logger.info("MCPManager: MCP session ready.")
                    self._ready.set()

                    # Serve requests until the connection drops
                    while True:
                        op, args, future = await self._queue.get()
                        try:
                            if op == "list_tools":
                                result = await session.list_tools()
                            elif op == "call_tool":
                                result = await session.call_tool(
                                    name=args["name"],
                                    arguments=args["arguments"],
                                )
                            else:
                                raise ValueError(f"Unknown MCP op: {op!r}")
                            future.set_result(result)
                        except Exception as exc:
                            logger.error(f"MCPManager: op {op!r} failed: {exc}")
                            if not future.done():
                                future.set_exception(exc)

            except Exception as exc:
                logger.error(f"MCPManager: connection error: {exc}. Retrying in 3 s…")
                self._ready.clear()
                # Reset event for the next ready signal
                self._ready = asyncio.Event()
                await asyncio.sleep(3)


# --------------------------------------------------------------------------- #
# Module-level singleton (created lazily, started once per process)
# --------------------------------------------------------------------------- #

_manager: Optional[MCPManager] = None


def get_mcp_manager(server_url: str) -> "MCPManager":
    """
    Return (and lazily create) the singleton MCPManager.

    NOTE: this function only creates the object — it does NOT start the worker
    task.  The task is scheduled by async_runner.start_mcp_manager() via
    loop.call_soon_threadsafe() so that create_task() runs inside the loop.
    """
    global _manager
    if _manager is None:
        _manager = MCPManager(server_url)
        logger.info("MCPManager singleton created (worker task not yet started).")
    return _manager
