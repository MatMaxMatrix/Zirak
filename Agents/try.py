#%%
from config import Config

tools_path = getattr(Config, 'TOOLS_DIR', None)
print(tools_path)

# %%
prompt_path = getattr(Config, 'PROMPTS_DIR', None)
print(prompt_path)
# %%
