import pygame
import sys
import os
import random

# Initialize Pygame
pygame.init()

# Screen dimensions
WIDTH = 800
HEIGHT = 600

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)

# Initialize screen
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption('Simple Game')

# Clock for controlling frame rate
clock = pygame.time.Clock()

# Load assets
asset_path = os.path.join(os.path.dirname(__file__), '../assets')

# Load sounds
collision_sound = pygame.mixer.Sound(os.path.join(asset_path, 'collision.wav'))
game_over_sound = pygame.mixer.Sound(os.path.join(asset_path, 'game_over.wav'))

# Load background music
pygame.mixer.music.load(os.path.join(asset_path, 'background_music.mp3'))

# Player class
class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((50, 50))
        self.image.fill(RED)
        self.rect = self.image.get_rect()
        self.rect.center = (WIDTH // 2, HEIGHT // 2)
        self.speed = 5

    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.rect.x -= self.speed
        if keys[pygame.K_RIGHT]:
            self.rect.x += self.speed
        if keys[pygame.K_UP]:
            self.rect.y -= self.speed
        if keys[pygame.K_DOWN]:
            self.rect.y += self.speed

        # Keep player within screen bounds
        self.rect.x = max(0, min(self.rect.x, WIDTH - self.rect.width))
        self.rect.y = max(0, min(self.rect.y, HEIGHT - self.rect.height))

# Obstacle class
class Obstacle(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((30, 30))
        self.image.fill(BLACK)
        self.rect = self.image.get_rect()
        self.rect.x = random.randint(0, WIDTH - self.rect.width)
        self.rect.y = random.randint(0, HEIGHT - self.rect.height)

# Main menu
def main_menu():
    while True:
        screen.fill(WHITE)
        font = pygame.font.Font(None, 74)
        title = font.render('Simple Game', True, BLACK)
        screen.blit(title, (WIDTH // 2 - title.get_width() // 2, 100))

        font = pygame.font.Font(None, 50)
        start_text = font.render('Press SPACE to Start', True, BLACK)
        screen.blit(start_text, (WIDTH // 2 - start_text.get_width() // 2, 300))

        instructions_text = font.render('Press I for Instructions', True, BLACK)
        screen.blit(instructions_text, (WIDTH // 2 - instructions_text.get_width() // 2, 400))

        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    return
                if event.key == pygame.K_i:
                    show_instructions()

# Instructions screen
def show_instructions():
    while True:
        screen.fill(WHITE)
        font = pygame.font.Font(None, 50)
        instructions = [
            'Use arrow keys to move the player.',
            'Collect all obstacles to win.',
            'Press ESC to return to the main menu.'
        ]
        for i, line in enumerate(instructions):
            text = font.render(line, True, BLACK)
            screen.blit(text, (WIDTH // 2 - text.get_width() // 2, 200 + i * 50))

        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return

# Game screen
def game_screen():
    # Initialize player and obstacles
    player = Player()
    obstacles = pygame.sprite.Group()
    for _ in range(10):
        obstacle = Obstacle()
        obstacles.add(obstacle)

    # Score
    score = 0
    font = pygame.font.Font(None, 36)

    # Play background music
    pygame.mixer.music.play(-1)

    # Game loop
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # Update
        player.update()

        # Check for collisions
        if pygame.sprite.spritecollide(player, obstacles, True):
            score += 1
            collision_sound.play()

        # Game over condition
        if len(obstacles) == 0:
            running = False
            game_over_sound.play()

        # Draw
        screen.fill(WHITE)
        screen.blit(player.image, player.rect)
        obstacles.draw(screen)

        # Display score
        score_text = font.render(f'Score: {score}', True, BLACK)
        screen.blit(score_text, (10, 10))

        # Update display
        pygame.display.flip()

        # Cap frame rate
        clock.tick(60)

    pygame.mixer.music.stop()

# Main function
def main():
    main_menu()
    game_screen()
    pygame.quit()
    sys.exit()

if __name__ == '__main__':
    main()