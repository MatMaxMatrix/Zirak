"""
Unit tests for MCP tool implementations.

Tools that require external services (E2B, browser automation, etc.) are
tested with mocked dependencies.  Tests verify:
  - The tool's ``name`` and ``description`` attributes satisfy MCP naming rules.
  - ``input_schema`` is a valid JSON Schema object.
  - ``execute()`` returns a string on the happy path.
  - ``execute()`` handles errors gracefully (returns string, not exception).
"""

import re
import pytest


# MCP tool name constraint: 1-64 chars, [a-zA-Z0-9_-]
_MCP_NAME_RE = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _assert_valid_tool_meta(tool_cls):
    """Check name, description, and input_schema for MCP compliance."""
    instance = tool_cls.__new__(tool_cls)

    assert hasattr(instance, "name"), f"{tool_cls.__name__} missing .name"
    assert _MCP_NAME_RE.match(instance.name), (
        f"{tool_cls.__name__}.name {instance.name!r} violates MCP naming rules"
    )

    assert hasattr(instance, "description"), f"{tool_cls.__name__} missing .description"
    assert isinstance(instance.description, str) and len(instance.description) > 0

    assert hasattr(instance, "input_schema"), f"{tool_cls.__name__} missing .input_schema"
    schema = instance.input_schema
    assert isinstance(schema, dict), "input_schema must be a dict"


# ---------------------------------------------------------------------------
# Base class
# ---------------------------------------------------------------------------


class TestBaseTool:
    def test_abstract_methods_required(self):
        from app.agents.tools.base import BaseTool

        with pytest.raises(TypeError):
            BaseTool()  # Can't instantiate abstract class

    def test_subclass_must_implement_execute(self):
        from app.agents.tools.base import BaseTool

        class Incomplete(BaseTool):
            name = "incomplete"
            description = "missing execute"
            input_schema = {}

        with pytest.raises(TypeError):
            Incomplete()


# ---------------------------------------------------------------------------
# WebScraperTool
# ---------------------------------------------------------------------------


class TestWebScraperTool:
    def test_meta(self):
        from app.agents.tools.web_scraper_tool import WebScraperTool
        _assert_valid_tool_meta(WebScraperTool)

    def test_execute_returns_string(self, monkeypatch, requests_mock):
        from app.agents.tools.web_scraper_tool import WebScraperTool

        requests_mock.get("https://example.com", text="<html><body>Hello</body></html>")
        tool = WebScraperTool()
        result = tool.execute(url="https://example.com")

        assert isinstance(result, str)
        assert len(result) > 0

    def test_execute_handles_request_error(self, monkeypatch, requests_mock):
        import requests
        from app.agents.tools.web_scraper_tool import WebScraperTool

        requests_mock.get("https://bad.example.com", exc=requests.ConnectionError)
        tool = WebScraperTool()
        result = tool.execute(url="https://bad.example.com")

        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# DuckDuckGoTool
# ---------------------------------------------------------------------------


class TestDuckDuckGoTool:
    def test_meta(self):
        from app.agents.tools.duckduckgo_tool import DuckduckgoTool
        _assert_valid_tool_meta(DuckduckgoTool)

    def test_execute_returns_string(self, requests_mock):
        from app.agents.tools.duckduckgo_tool import DuckduckgoTool

        requests_mock.get(re.compile(r".*duckduckgo.*"), text="<html><body>Results</body></html>")
        tool = DuckduckgoTool()
        result = tool.execute(query="python testing")

        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# FileCreatorTool
# ---------------------------------------------------------------------------


class TestFileCreatorTool:
    def test_meta(self):
        from app.agents.tools.file_creator_tool import FileCreatorTool
        _assert_valid_tool_meta(FileCreatorTool)

    def test_creates_file(self, tmp_path):
        from app.agents.tools.file_creator_tool import FileCreatorTool

        tool = FileCreatorTool()
        target = str(tmp_path / "hello.txt")
        result = tool.execute(path=target, content="Hello, world!")

        assert isinstance(result, str)
        assert (tmp_path / "hello.txt").read_text() == "Hello, world!"

    def test_creates_nested_dirs(self, tmp_path):
        from app.agents.tools.file_creator_tool import FileCreatorTool

        tool = FileCreatorTool()
        target = str(tmp_path / "deep" / "nested" / "file.py")
        tool.execute(path=target, content="# empty")

        assert (tmp_path / "deep" / "nested" / "file.py").exists()


# ---------------------------------------------------------------------------
# FileContentReaderTool
# ---------------------------------------------------------------------------


class TestFileContentReaderTool:
    def test_meta(self):
        from app.agents.tools.file_content_reader_tool import FileContentReaderTool
        _assert_valid_tool_meta(FileContentReaderTool)

    def test_reads_existing_file(self, tmp_path):
        from app.agents.tools.file_content_reader_tool import FileContentReaderTool

        f = tmp_path / "readme.txt"
        f.write_text("test content")
        tool = FileContentReaderTool()
        result = tool.execute(path=str(f))

        assert isinstance(result, str)
        assert "test content" in result

    def test_handles_missing_file(self, tmp_path):
        from app.agents.tools.file_content_reader_tool import FileContentReaderTool

        tool = FileContentReaderTool()
        result = tool.execute(path=str(tmp_path / "nonexistent.txt"))

        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# FileEditTool
# ---------------------------------------------------------------------------


class TestFileEditTool:
    def test_meta(self):
        from app.agents.tools.file_edit_tool import FileEditTool
        _assert_valid_tool_meta(FileEditTool)

    def test_replaces_content(self, tmp_path):
        from app.agents.tools.file_edit_tool import FileEditTool

        f = tmp_path / "code.py"
        f.write_text("old_value = 1\n")
        tool = FileEditTool()
        result = tool.execute(
            path=str(f),
            old_content="old_value = 1",
            new_content="new_value = 2",
        )

        assert isinstance(result, str)
        assert f.read_text() == "new_value = 2\n"


# ---------------------------------------------------------------------------
# CreateFoldersTool
# ---------------------------------------------------------------------------


class TestCreateFoldersTool:
    def test_meta(self):
        from app.agents.tools.create_folders_tool import CreateFoldersTool
        _assert_valid_tool_meta(CreateFoldersTool)

    def test_creates_directory(self, tmp_path):
        from app.agents.tools.create_folders_tool import CreateFoldersTool

        tool = CreateFoldersTool()
        target = str(tmp_path / "new_folder")
        result = tool.execute(path=target)

        assert isinstance(result, str)
        assert (tmp_path / "new_folder").is_dir()

    def test_idempotent_on_existing(self, tmp_path):
        from app.agents.tools.create_folders_tool import CreateFoldersTool

        tool = CreateFoldersTool()
        target = str(tmp_path / "exists")
        (tmp_path / "exists").mkdir()
        result = tool.execute(path=target)

        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# TerminalCommandTool
# ---------------------------------------------------------------------------


class TestTerminalCommandTool:
    def test_meta(self):
        from app.agents.tools.terminal_command_tool import TerminalCommandTool
        _assert_valid_tool_meta(TerminalCommandTool)

    def test_runs_echo(self, tmp_path):
        from app.agents.tools.terminal_command_tool import TerminalCommandTool

        tool = TerminalCommandTool()
        result = tool.execute(command="echo hello", working_directory=str(tmp_path))

        assert isinstance(result, str)
        assert "hello" in result.lower()

    def test_handles_bad_command(self, tmp_path):
        from app.agents.tools.terminal_command_tool import TerminalCommandTool

        tool = TerminalCommandTool()
        result = tool.execute(command="nonexistent_cmd_xyz_123", working_directory=str(tmp_path))

        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# LintingTool
# ---------------------------------------------------------------------------


class TestLintingTool:
    def test_meta(self):
        from app.agents.tools.linting_tool import LintingTool
        _assert_valid_tool_meta(LintingTool)

    def test_lints_clean_python(self, tmp_path):
        from app.agents.tools.linting_tool import LintingTool

        f = tmp_path / "clean.py"
        f.write_text("x = 1\n")
        tool = LintingTool()
        result = tool.execute(path=str(f))

        assert isinstance(result, str)

    def test_lints_dirty_python(self, tmp_path):
        from app.agents.tools.linting_tool import LintingTool

        f = tmp_path / "dirty.py"
        f.write_text("import os\nimport sys\nx=1\n")  # unused imports + no space
        tool = LintingTool()
        result = tool.execute(path=str(f))

        assert isinstance(result, str)
