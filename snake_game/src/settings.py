class GameSettings:
    def __init__(self, difficulty='Normal'):
        # Default settings
        self.difficulty_presets = {
            'Easy': {'snake_speed': 10, 'grid_size': 20, 'initial_length': 3},
            'Normal': {'snake_speed': 15, 'grid_size': 15, 'initial_length': 5},
            'Hard': {'snake_speed': 20, 'grid_size': 10, 'initial_length': 7}
        }
        
        # Load the selected difficulty preset
        self.set_difficulty(difficulty)

    def set_difficulty(self, difficulty):
        if difficulty in self.difficulty_presets:
            preset = self.difficulty_presets[difficulty]
            self.snake_speed = preset['snake_speed']
            self.grid_size = preset['grid_size']
            self.initial_length = preset['initial_length']
        else:
            raise ValueError(f"Unknown difficulty level: {difficulty}")

    def update_settings(self, snake_speed=None, grid_size=None, initial_length=None):
        if snake_speed is not None:
            self.snake_speed = snake_speed
        if grid_size is not None:
            self.grid_size = grid_size
        if initial_length is not None:
            self.initial_length = initial_length
