import pygame
import random
import sys

# Initialize pygame
pygame.init()

# Game constants
WIDTH, HEIGHT = 600, 600
GRID_SIZE = 20
GRID_WIDTH = WIDTH // GRID_SIZE
GRID_HEIGHT = HEIGHT // GRID_SIZE
FPS = 10

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
RED = (255, 0, 0)
BLUE = (0, 120, 255)
GRAY = (40, 40, 40)

# Directions
UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)

class Snake:
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.length = 3
        self.positions = [(GRID_WIDTH // 2, GRID_HEIGHT // 2)]
        self.direction = RIGHT
        self.score = 0
        self.grow_pending = 2  # Start with 3 segments
    
    def get_head_position(self):
        return self.positions[0]
    
    def turn(self, point):
        # Prevent turning directly opposite direction
        if self.length > 1 and (point[0] * -1, point[1] * -1) == self.direction:
            return
        self.direction = point
    
    def move(self):
        head = self.get_head_position()
        x, y = self.direction
        new_x = (head[0] + x) % GRID_WIDTH
        new_y = (head[1] + y) % GRID_HEIGHT
        new_position = (new_x, new_y)
        
        # Check for collision with self
        if new_position in self.positions[1:]:
            return False  # Game over
        
        self.positions.insert(0, new_position)
        
        if self.grow_pending > 0:
            self.grow_pending -= 1
        else:
            self.positions.pop()
        
        return True  # Still alive
    
    def grow(self):
        self.grow_pending += 1
        self.score += 10
    
    def draw(self, surface):
        for i, p in enumerate(self.positions):
            # Draw snake segment
            rect = pygame.Rect(p[0] * GRID_SIZE, p[1] * GRID_SIZE, GRID_SIZE, GRID_SIZE)
            
            # Head is a different color
            if i == 0:
                pygame.draw.rect(surface, GREEN, rect)
                pygame.draw.rect(surface, WHITE, rect, 1)
                
                # Draw eyes
                eye_size = GRID_SIZE // 5
                # Left eye
                if self.direction == RIGHT:
                    eye_pos = (rect.right - eye_size - 2, rect.top + eye_size)
                elif self.direction == LEFT:
                    eye_pos = (rect.left + 2, rect.top + eye_size)
                elif self.direction == UP:
                    eye_pos = (rect.left + eye_size, rect.top + 2)
                else:  # DOWN
                    eye_pos = (rect.left + eye_size, rect.bottom - eye_size - 2)
                
                pygame.draw.circle(surface, BLACK, eye_pos, eye_size)
                
                # Right eye
                if self.direction == RIGHT:
                    eye_pos = (rect.right - eye_size - 2, rect.bottom - eye_size)
                elif self.direction == LEFT:
                    eye_pos = (rect.left + 2, rect.bottom - eye_size)
                elif self.direction == UP:
                    eye_pos = (rect.right - eye_size, rect.top + 2)
                else:  # DOWN
                    eye_pos = (rect.right - eye_size, rect.bottom - eye_size - 2)
                
                pygame.draw.circle(surface, BLACK, eye_pos, eye_size)
            else:
                # Body segments with gradient
                color_intensity = max(100, 255 - (i * 10))
                segment_color = (0, color_intensity, 0)
                pygame.draw.rect(surface, segment_color, rect)
                pygame.draw.rect(surface, WHITE, rect, 1)

class Food:
    def __init__(self):
        self.position = (0, 0)
        self.color = RED
        self.randomize_position()
    
    def randomize_position(self):
        self.position = (random.randint(0, GRID_WIDTH - 1), 
                         random.randint(0, GRID_HEIGHT - 1))
    
    def draw(self, surface):
        rect = pygame.Rect(self.position[0] * GRID_SIZE, 
                          self.position[1] * GRID_SIZE, 
                          GRID_SIZE, GRID_SIZE)
        pygame.draw.rect(surface, self.color, rect)
        pygame.draw.rect(surface, WHITE, rect, 1)
        
        # Draw a little shine effect
        shine_rect = pygame.Rect(self.position[0] * GRID_SIZE + GRID_SIZE//4,
                                self.position[1] * GRID_SIZE + GRID_SIZE//4,
                                GRID_SIZE//4, GRID_SIZE//4)
        pygame.draw.ellipse(surface, (255, 200, 200), shine_rect)

def draw_grid(surface):
    for y in range(0, HEIGHT, GRID_SIZE):
        for x in range(0, WIDTH, GRID_SIZE):
            rect = pygame.Rect(x, y, GRID_SIZE, GRID_SIZE)
            pygame.draw.rect(surface, GRAY, rect, 1)

def draw_score(surface, score, high_score):
    font = pygame.font.SysFont('Arial', 25)
    score_text = font.render(f'Score: {score}', True, WHITE)
    high_score_text = font.render(f'High Score: {high_score}', True, WHITE)
    surface.blit(score_text, (10, 10))
    surface.blit(high_score_text, (WIDTH - high_score_text.get_width() - 10, 10))

def draw_game_over(surface, score):
    font_large = pygame.font.SysFont('Arial', 50)
    font_medium = pygame.font.SysFont('Arial', 30)
    
    game_over_text = font_large.render('GAME OVER', True, RED)
    score_text = font_medium.render(f'Final Score: {score}', True, WHITE)
    restart_text = font_medium.render('Press SPACE to restart', True, WHITE)
    
    surface.blit(game_over_text, (WIDTH//2 - game_over_text.get_width()//2, HEIGHT//2 - 60))
    surface.blit(score_text, (WIDTH//2 - score_text.get_width()//2, HEIGHT//2))
    surface.blit(restart_text, (WIDTH//2 - restart_text.get_width()//2, HEIGHT//2 + 40))

def draw_instructions(surface):
    font = pygame.font.SysFont('Arial', 20)
    instructions = [
        "Use ARROW KEYS to move",
        "Eat the red food to grow",
        "Don't hit yourself!",
        "Press P to pause",
        "Press ESC to quit"
    ]
    
    for i, text in enumerate(instructions):
        rendered = font.render(text, True, WHITE)
        surface.blit(rendered, (10, HEIGHT - 120 + i * 25))

def main():
    # Set up the display
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Python Snake Game")
    clock = pygame.time.Clock()
    
    # Game objects
    snake = Snake()
    food = Food()
    
    # Game state
    game_over = False
    paused = False
    high_score = 0
    
    # Main game loop
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            
            if event.type == pygame.KEYDOWN:
                if game_over:
                    if event.key == pygame.K_SPACE:
                        snake.reset()
                        food.randomize_position()
                        game_over = False
                else:
                    if event.key == pygame.K_UP:
                        snake.turn(UP)
                    elif event.key == pygame.K_DOWN:
                        snake.turn(DOWN)
                    elif event.key == pygame.K_LEFT:
                        snake.turn(LEFT)
                    elif event.key == pygame.K_RIGHT:
                        snake.turn(RIGHT)
                    elif event.key == pygame.K_p:
                        paused = not paused
                    elif event.key == pygame.K_ESCAPE:
                        pygame.quit()
                        sys.exit()
        
        if not game_over and not paused:
            # Move snake
            if not snake.move():
                game_over = True
                high_score = max(high_score, snake.score)
            
            # Check if snake ate food
            if snake.get_head_position() == food.position:
                snake.grow()
                food.randomize_position()
                
                # Make sure food doesn't spawn on snake
                while food.position in snake.positions:
                    food.randomize_position()
        
        # Drawing
        screen.fill(BLACK)
        draw_grid(screen)
        snake.draw(screen)
        food.draw(screen)
        draw_score(screen, snake.score, high_score)
        draw_instructions(screen)
        
        if game_over:
            draw_game_over(screen, snake.score)
        elif paused:
            font = pygame.font.SysFont('Arial', 50)
            pause_text = font.render('PAUSED', True, BLUE)
            screen.blit(pause_text, (WIDTH//2 - pause_text.get_width()//2, HEIGHT//2))
        
        pygame.display.update()
        clock.tick(FPS)

if __name__ == "__main__":
    main()