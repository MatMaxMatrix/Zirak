#%%
import importlib
import pkgutil
import inspect
from config import Config
from tools.base import BaseTool



tools_path = getattr(Config, 'TOOLS_DIR', None)
tools = []
for module_info in pkgutil.iter_modules([str(tools_path)]):
    print(module_info.name)
    module = importlib.import_module(f'tools.{module_info.name}')

    for name, obj in inspect.getmembers(module):
        if (inspect.isclass(obj) and issubclass(obj, BaseTool) and obj != BaseTool):
            tool_instance = obj()
            tools.append({
                "name": tool_instance.name,
                "description": tool_instance.description,
                "input_schema": tool_instance.input_schema
            })
    if module_info.name == 'diffeditortool':
        break
# %%
print(tools)
# %%
