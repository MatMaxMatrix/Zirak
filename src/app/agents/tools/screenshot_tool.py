import base64
import io
from typing import Any

from .base import BaseTool

# Lazy imports — resolved at execute() time so that importing this module
# in a headless environment (CI, WSL without X) does not crash.
_pyautogui = None
_PIL_Image = None


def _load_deps() -> tuple:
    global _pyautogui, _PIL_Image
    if _pyautogui is None:
        try:
            import pyautogui  # noqa: PLC0415
            from PIL import Image  # noqa: PLC0415

            _pyautogui = pyautogui
            _PIL_Image = Image
        except ImportError as exc:
            raise RuntimeError(
                "ScreenshotTool requires 'pyautogui' and 'Pillow': pip install pyautogui Pillow"
            ) from exc
    return _pyautogui, _PIL_Image


class ScreenshotTool(BaseTool):
    name = "screenshottool"
    description = """
    Captures a screenshot of the current screen and returns an image block ready to be sent to Claude.
    Optionally, a specific region of the screen can be captured by providing coordinates.

    Inputs:
    - region (optional): A list of four integers [x, y, width, height] specifying the region of the screen to capture.
      If omitted, captures the entire screen.

    The output is a JSON-formatted string that can be included directly as part of the conversation content:
    [
      {
        "type": "image",
        "source": {
          "type": "base64",
          "media_type": "image/png",
          "data": "<base64-encoded png>"
        }
      }
    ]

    This block can be inserted into the messages array sent to Claude via the Messages API.
    """
    input_schema = {
        "type": "object",
        "properties": {
            "region": {
                "type": "array",
                "items": {"type": "integer"},
                "description": "Optional region [x, y, width, height] to capture",
                "minItems": 4,
                "maxItems": 4,
            }
        },
        "required": [],
    }

    def execute(self, **kwargs) -> Any:
        region = kwargs.get("region", None)
        if region is not None and len(region) != 4:
            return "Invalid region specified. Must be a list of four integers: [x, y, width, height]."

        try:
            pyautogui, Image = _load_deps()
            # Take screenshot (full screen or specified region)
            screenshot: Any = pyautogui.screenshot(region=region)

            # Convert to base64
            with io.BytesIO() as buffer:
                screenshot.save(buffer, format="PNG")
                encoded_data = base64.b64encode(buffer.getvalue()).decode("utf-8")

            # Return the image block as a Python list/dict (not as JSON string)
            return [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": encoded_data,
                    },
                }
            ]

        except Exception as e:
            return f"Error capturing screenshot: {str(e)}"
