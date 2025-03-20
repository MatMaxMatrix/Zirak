from Agents.tools.base import BaseTool
import os
import pathlib
from typing import List
from pathlib import Path

class CreateFoldersTool(BaseTool):
    name = "createfolderstool"
    description = '''
    Creates new folders at specified paths, including nested directories if needed.
    Accepts a list of folder paths and creates each folder along with any necessary parent directories.
    Supports both absolute and relative paths.
    Returns status messages for each folder creation attempt.
    '''
    input_schema = {
        "type": "object",
        "properties": {
            "folder_paths": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "List of folder paths to create"
            }
        },
        "required": ["folder_paths"]
    }

    def execute(self, **kwargs) -> str:
        folder_paths: List[str] = kwargs.get("folder_paths", [])
        
        # Also accept 'paths' parameter for backward compatibility
        if not folder_paths and "paths" in kwargs:
            folder_paths = kwargs.get("paths", [])
            
        if not folder_paths:
            return "No folder paths provided"

        results = []
        for path in folder_paths:
            try:
                # Normalize path
                normalized_path = os.path.normpath(path)
                absolute_path = os.path.abspath(normalized_path)
                
                # Validate path
                if not all(c not in '<>:"|?*' for c in absolute_path):
                    results.append(f"Invalid characters in path: {path}")
                    continue

                # Create directory
                Path(absolute_path).mkdir(parents=True, exist_ok=True)
                results.append(f"Successfully created folder: {path}")
                
                # Verify the directory was created
                if os.path.exists(absolute_path) and os.path.isdir(absolute_path):
                    results.append(f"Verified folder exists: {path}")
                else:
                    results.append(f"Warning: Folder creation command completed but folder may not exist: {path}")

            except PermissionError:
                results.append(f"Permission denied: Unable to create folder {path}")
            except OSError as e:
                results.append(f"Error creating folder {path}: {str(e)}")
            except Exception as e:
                results.append(f"Unexpected error creating folder {path}: {str(e)}")

        return "\n".join(results)