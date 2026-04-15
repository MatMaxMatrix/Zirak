# Snake Game - Python PyGame Implementation

A classic Snake game built with Python and PyGame.

## Features

- **Classic Snake gameplay**: Control the snake to eat food and grow longer
- **Score tracking**: Current score and high score display
- **Game over detection**: Collision with yourself ends the game
- **Restart functionality**: Press SPACE to restart after game over
- **Visual polish**: 
  - Snake with eyes that follow direction
  - Gradient-colored snake body
  - Grid background
  - Food with shine effect
  - Clean UI with score display

## Controls

- **Arrow Keys**: Control snake direction (UP, DOWN, LEFT, RIGHT)
- **SPACE**: Restart game after game over
- **ESC**: Quit game

## Installation

1. Make sure you have Python 3.6+ installed
2. Install PyGame:
   ```bash
   pip install pygame
   ```
   Or using uv:
   ```bash
   uv pip install pygame
   ```

3. Run the game:
   ```bash
   python snake_game.py
   ```

## Game Rules

1. Control the snake using arrow keys
2. Eat the red food to grow longer and increase your score
3. Avoid colliding with yourself
4. The snake can wrap around the screen edges
5. Each food eaten gives you 10 points
6. Game ends when the snake collides with itself

## Code Structure

- `Snake` class: Handles snake movement, growth, and drawing
- `Food` class: Manages food position and drawing
- Main game loop: Handles input, game logic, and rendering
- Helper functions: Grid drawing, score display, game over screen

## Customization

You can easily modify these constants at the top of the file:
- `WIDTH, HEIGHT`: Game window size
- `GRID_SIZE`: Size of each grid cell
- `FPS`: Game speed (frames per second)
- Colors: All color constants are defined

## Requirements

- Python 3.6+
- PyGame 2.0+

## License

Free to use and modify for any purpose.

Enjoy the game! 🐍