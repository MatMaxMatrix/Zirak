# %%
import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, mock_open, patch

# Import the tools using absolute imports
from browsertool import BrowserTool
from createfolderstool import CreateFoldersTool
from diffeditortool import DiffEditorTool
from filecontentreadertool import FileContentReaderTool
from filecreatortool import FileCreatorTool
from fileedittool import FileEditTool
from lintingtool import LintingTool
from uvpackagemanager import UVPackageManager
from webscrapertool import WebScraperTool


class ToolTestCase(unittest.TestCase):
    """Base test case for all tool tests."""

    def setUp(self):
        """Set up a temporary directory for file operations."""
        self.temp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.temp_dir)

    def create_temp_file(self, filename, content):
        """Create a temporary file with the given content."""
        file_path = os.path.join(self.temp_dir, filename)
        with open(file_path, "w") as f:
            f.write(content)
        return file_path


class FileContentReaderToolTest(ToolTestCase):
    """Test the FileContentReaderTool."""

    def test_read_file(self):
        """Test reading a file."""
        # Create a test file
        test_content = "This is a test file."
        file_path = self.create_temp_file("test.txt", test_content)

        # Initialize the tool
        tool = FileContentReaderTool()

        # Execute the tool
        result = tool.execute(file_paths=[file_path])
        result_dict = json.loads(result)

        # Check the result
        self.assertIn(file_path, result_dict)
        self.assertEqual(result_dict[file_path], test_content)

    def test_read_multiple_files(self):
        """Test reading multiple files."""
        # Create test files
        file1_path = self.create_temp_file("file1.txt", "Content of file 1")
        file2_path = self.create_temp_file("file2.txt", "Content of file 2")

        # Initialize the tool
        tool = FileContentReaderTool()

        # Execute the tool
        result = tool.execute(file_paths=[file1_path, file2_path])
        result_dict = json.loads(result)

        # Check the result
        self.assertIn(file1_path, result_dict)
        self.assertIn(file2_path, result_dict)
        self.assertEqual(result_dict[file1_path], "Content of file 1")
        self.assertEqual(result_dict[file2_path], "Content of file 2")

    def test_read_nonexistent_file(self):
        """Test reading a nonexistent file."""
        # Initialize the tool
        tool = FileContentReaderTool()

        # Execute the tool with a nonexistent file
        result = tool.execute(file_paths=["nonexistent.txt"])
        result_dict = json.loads(result)

        # Check the result
        self.assertIn("nonexistent.txt", result_dict)
        self.assertEqual(result_dict["nonexistent.txt"], "Error: File not found")


class FileCreatorToolTest(ToolTestCase):
    """Test the FileCreatorTool."""

    def test_create_file(self):
        """Test creating a file."""
        # Create a real file for testing
        file_path = os.path.join(self.temp_dir, "created.txt")
        file_content = "This is a created file."

        # Initialize the tool
        tool = FileCreatorTool()

        # Execute the tool with the correct format
        files_data = {"files": {"path": file_path, "content": file_content}}
        result = tool.execute(**files_data)

        # Check if the file was created
        self.assertTrue(os.path.exists(file_path))

        # Check the file content
        with open(file_path) as f:
            content = f.read()
        self.assertEqual(content, file_content)

        # Check the result - match the actual output format
        result_dict = json.loads(result)
        self.assertEqual(result_dict["created_files"], 1)
        self.assertEqual(result_dict["failed_files"], 0)
        self.assertTrue(result_dict["results"][0]["success"])

    def test_create_file_in_nonexistent_directory(self):
        """Test creating a file in a nonexistent directory."""
        # Define the file to create in a nonexistent directory
        file_path = os.path.join(self.temp_dir, "nonexistent_dir", "created.txt")
        file_content = "This is a created file."

        # Initialize the tool
        tool = FileCreatorTool()

        # Execute the tool with the correct format
        files_data = {"files": {"path": file_path, "content": file_content}}
        result = tool.execute(**files_data)

        # Check if the file was created
        self.assertTrue(os.path.exists(file_path))

        # Check the file content
        with open(file_path) as f:
            content = f.read()
        self.assertEqual(content, file_content)

        # Check the result - match the actual output format
        result_dict = json.loads(result)
        self.assertEqual(result_dict["created_files"], 1)
        self.assertEqual(result_dict["failed_files"], 0)
        self.assertTrue(result_dict["results"][0]["success"])


class FileEditToolTest(ToolTestCase):
    """Test the FileEditTool."""

    def test_edit_file(self):
        """Test editing a file."""
        # Create a test file
        original_content = "Line 1\nLine 2\nLine 3\n"
        file_path = self.create_temp_file("edit_test.txt", original_content)

        # Initialize the tool
        tool = FileEditTool()

        # Execute the tool to replace the entire content
        new_content = "Line 1\nModified Line 2\nLine 3\n"
        result = tool.execute(
            file_path=file_path, edit_type="full", new_content=new_content
        )

        # Check if the file was edited
        with open(file_path) as f:
            content = f.read()
        self.assertEqual(content, new_content)

        # Check the result - match the actual output format
        self.assertIn("File successfully updated", result)


class CreateFoldersToolTest(ToolTestCase):
    """Test the CreateFoldersTool."""

    def test_create_folders(self):
        """Test creating folders."""
        # Define the folders to create
        folder_paths = [
            os.path.join(self.temp_dir, "folder1"),
            os.path.join(self.temp_dir, "folder2", "subfolder"),
        ]

        # Initialize the tool
        tool = CreateFoldersTool()

        # Execute the tool
        result = tool.execute(folder_paths=folder_paths)

        # Check if the folders were created
        for folder_path in folder_paths:
            self.assertTrue(os.path.exists(folder_path))
            self.assertTrue(os.path.isdir(folder_path))

        # Check the result
        self.assertIn("Successfully created folder", result)
        self.assertIn("Verified folder exists", result)


class DiffEditorToolTest(ToolTestCase):
    """Test the DiffEditorTool."""

    def test_diff_editor(self):
        """Test the diff editor tool."""
        # Create test file
        original_content = "Line 1\nLine 2\nLine 3\n"
        file_path = self.create_temp_file("diff_test.txt", original_content)

        # Initialize the tool
        tool = DiffEditorTool()

        # Execute the tool with the correct parameter names
        old_text = "Line 2"
        new_text = "Modified Line 2"
        result = tool.execute(path=file_path, old_text=old_text, new_text=new_text)

        # Check if the file was modified
        with open(file_path) as f:
            content = f.read()
        self.assertEqual(content, "Line 1\nModified Line 2\nLine 3\n")

        # Check the result
        self.assertIn("Successfully replaced", result)


class LintingToolTest(ToolTestCase):
    """Test the LintingTool."""

    @patch("subprocess.run")
    def test_linting(self, mock_run):
        """Test the linting tool."""
        # Mock subprocess.run to return a successful result
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.stdout = "No linting errors found."
        mock_process.stderr = ""
        mock_run.return_value = mock_process

        # Create a test Python file
        file_path = self.create_temp_file("test.py", "print('Hello, world!')")

        # Initialize the tool
        tool = LintingTool()

        # Execute the tool
        result = tool.execute(file_path=file_path)

        # Check the result - adjust to match actual output
        self.assertIn("No linting errors found", result)


class ToolCreatorToolTest(ToolTestCase):
    """Test the ToolCreatorTool."""

    @patch("builtins.open", new_callable=mock_open)
    @patch("os.path.exists")
    @patch("os.makedirs")
    def test_tool_creator(self, mock_makedirs, mock_exists, mock_file):
        """Test the tool creator."""
        # Skip this test for now as it requires authentication
        self.skipTest("Requires authentication")


class UVPackageManagerTest(ToolTestCase):
    """Test the UVPackageManager."""

    @patch("subprocess.run")
    def test_install_package(self, mock_run):
        """Test installing a package."""
        # Mock subprocess.run to return a successful result
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.stdout = "Successfully installed test-package"
        mock_run.return_value = mock_process

        # Initialize the tool
        tool = UVPackageManager()

        # Execute the tool
        result = tool.execute(command="install", packages=["test-package"])

        # Check the result
        self.assertIn("Successfully installed", result)


class DuckduckgoToolTest(unittest.TestCase):
    """Test the DuckduckgoTool."""

    @patch("duckduckgo_search.DDGS.text")
    def test_search(self, mock_text):
        """Test searching with DuckDuckGo."""
        # Skip this test as it requires external API
        self.skipTest("Requires external API")


class WebScraperToolTest(unittest.TestCase):
    """Test the WebScraperTool."""

    @patch("requests.get")
    def test_scrape_webpage(self, mock_get):
        """Test scraping a webpage."""
        # Mock the HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = (
            "<html><body><h1>Test Page</h1><p>This is a test page.</p></body></html>"
        )
        mock_get.return_value = mock_response

        # Initialize the tool
        tool = WebScraperTool()

        # Execute the tool
        result = tool.execute(url="https://example.com")

        # Check the result
        self.assertIn("Test Page", result)
        self.assertIn("This is a test page", result)


class E2bCodeToolTest(unittest.TestCase):
    """Test the E2bCodeTool."""

    def test_execute_code(self):
        """Test executing code with E2B."""
        # Skip this test as it requires external API
        self.skipTest("Requires E2B API key")


class BrowserToolTest(unittest.TestCase):
    """Test the BrowserTool."""

    @patch("webbrowser.open")
    def test_open_url(self, mock_open):
        """Test opening a URL in the browser."""
        # Mock webbrowser.open to return True
        mock_open.return_value = True

        # Initialize the tool
        tool = BrowserTool()

        # Execute the tool with the correct parameter name
        result = tool.execute(urls="https://example.com")

        # Check the result
        self.assertIn("Successfully opened", result)


class ScreenshotToolTest(unittest.TestCase):
    """Test the ScreenshotTool."""

    def test_take_screenshot(self):
        """Test taking a screenshot."""
        # Skip this test as it requires system access
        self.skipTest("Requires system access for screenshots")


class AICodeReplacementTest(ToolTestCase):
    """Test using DiffEditorTool for AI-generated code replacement."""

    def test_replace_code_segment(self):
        """Test replacing a specific code segment with AI-generated code."""
        # Create a test Python file with some code
        original_code = """def calculate_sum(a, b):
    # Add two numbers and return the result
    result = a + b
    print(f"The sum of {a} and {b} is {result}")
    return result

def calculate_product(a, b):
    # Multiply two numbers and return the result
    result = a * b
    print(f"The product of {a} and {b} is {result}")
    return result
"""
        file_path = self.create_temp_file("math_functions.py", original_code)

        # The specific code segment we want to replace (the calculate_sum function)
        old_code_segment = """def calculate_sum(a, b):
    # Add two numbers and return the result
    result = a + b
    print(f"The sum of {a} and {b} is {result}")
    return result"""

        # The AI-generated improved version of the function
        ai_generated_code = """def calculate_sum(a, b):
    # Add two numbers and return the result
    # Improved with input validation
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("Both arguments must be numbers")
    result = a + b
    print(f"The sum of {a} and {b} is {result}")
    return result"""

        # Initialize the DiffEditorTool
        tool = DiffEditorTool()

        # Execute the tool to replace the specific code segment
        result = tool.execute(
            path=file_path, old_text=old_code_segment, new_text=ai_generated_code
        )

        # Check if the file was modified correctly
        with open(file_path) as f:
            modified_code = f.read()

        # The expected code after replacement
        expected_code = """def calculate_sum(a, b):
    # Add two numbers and return the result
    # Improved with input validation
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("Both arguments must be numbers")
    result = a + b
    print(f"The sum of {a} and {b} is {result}")
    return result

def calculate_product(a, b):
    # Multiply two numbers and return the result
    result = a * b
    print(f"The product of {a} and {b} is {result}")
    return result
"""

        # Verify the code was replaced correctly
        self.assertEqual(modified_code, expected_code)

        # Check the result message
        self.assertIn("Successfully replaced", result)


if __name__ == "__main__":
    unittest.main()
