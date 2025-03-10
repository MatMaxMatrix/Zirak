import pygame
import sys
import random
from gui import WIDTH, HEIGHT, WHITE, BLACK, RED, BLUE

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
GREEN = (0, 255, 0)
YELLOW = (255, 255, 0)

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
power_up_sound = pygame.mixer.Sound(os.path.join(asset_path, 'power_up.wav'))

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
        self.power_up_active = False
        self.power_up_timer = 0

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

        # Update power-up timer
        if self.power_up_active:
            self.power_up_timer -= 1
            if self.power_up_timer <= 0:
                self.power_up_active = False
                self.speed = 5

# Obstacle class
class Obstacle(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((30, 30))
        self.image.fill(BLACK)
        self.rect = self.image.get_rect()
        self.rect.x = random.randint(0, WIDTH - self.rect.width)
        self.rect.y = random.randint(0, HEIGHT - self.rect.height)
        self.speed_x = random.randint(-2, 2)
        self.speed_y = random.randint(-2, 2)

    def update(self):
        self.rect.x += self.speed_x
        self.rect.y += self.speed_y

        # Bounce off screen edges
        if self.rect.left < 0 or self.rect.right > WIDTH:
            self.speed_x = -self.speed_x
        if self.rect.top < 0 or self.rect.bottom > HEIGHT:
            self.speed_y = -self.speed_y

# Collectible class
class Collectible(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((20, 20))
        self.image.fill(GREEN)
        self.rect = self.image.get_rect()
        self.rect.x = random.randint(0, WIDTH - self.rect.width)
        self.rect.y = random.randint(0, HEIGHT - self.rect.height)

# Power-up class
class PowerUp(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((20, 20))
        self.image.fill(YELLOW)
        self.rect = self.image.get_rect()
        self.rect.x = random.randint(0, WIDTH - self.rect.width)
        self.rect.y = random.randint(0, HEIGHT - self.rect.height)

# Game over screen
def game_over_screen(score):
    while True:
        screen.fill(WHITE)
        font = pygame.font.Font(None, 74)
        game_over_text = font.render('Game Over', True, BLACK)
        screen.blit(game_over_text, (WIDTH // 2 - game_over_text.get_width() // 2, 100))

        font = pygame.font.Font(None, 50)
        score_text = font.render(f'Final Score: {score}', True, BLACK)
        screen.blit(score_text, (WIDTH // 2 - score_text.get_width() // 2, 200))

        restart_text = font.render('Press R to Restart', True, BLACK)
        screen.blit(restart_text, (WIDTH // 2 - restart_text.get_width() // 2, 300))

        exit_text = font.render('Press ESC to Exit', True, BLACK)
        screen.blit(exit_text, (WIDTH // 2 - exit_text.get_width() // 2, 400))

        pygame.display.flip()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    return True
                if event.key == pygame.K_ESCAPE:
                    return False

# Game screen
def game_screen():
    # Initialize player, obstacles, collectibles, and power-ups
    player = Player()
    obstacles = pygame.sprite.Group()
    collectibles = pygame.sprite.Group()
    power_ups = pygame.sprite.Group()

    for _ in range(10):
        obstacle = Obstacle()
        obstacles.add(obstacle)

    for _ in range(5):
        collectible = Collectible()
        collectibles.add(collectible)

    for _ in range(2):
        power_up = PowerUp()
        power_ups.add(power_up)

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
        obstacles.update()

        # Check for collisions with obstacles
        if pygame.sprite.spritecollide(player, obstacles, False):
            if not player.power_up_active:
                running = False
                game_over_sound.play()

        # Check for collisions with collectibles
        collectibles_collected = pygame.sprite.spritecollide(player, collectibles, True)
        for collectible in collectibles_collected:
            score += 10
            collision_sound.play()

        # Check for collisions with power-ups
        power_ups_collected = pygame.sprite.spritecollide(player, power_ups, True)
        for power_up in power_ups_collected:
            player.power_up_active = True
            player.power_up_timer = 300  # 5 seconds at 60 FPS
            player.speed = 10
            power_up_sound.play()

        # Game over condition
        if len(collectibles) == 0:
            running = False
            game_over_sound.play()

        # Draw
        screen.fill(WHITE)
        screen.blit(player.image, player.rect)
        obstacles.draw(screen)
        collectibles.draw(screen)
        power_ups.draw(screen)

        # Display score
        score_text = font.render(f'Score: {score}', True, BLACK)
        screen.blit(score_text, (10, 10))

        # Update display
        pygame.display.flip()

        # Cap frame rate
        clock.tick(60)

    pygame.mixer.music.stop()

    # Show game over screen
    if game_over_screen(score):
        game_screen()
    else:
        pygame.quit()
        sys.exit()

# Main function
def main():
    game_screen()
    pygame.quit()
    sys.exit()

if __name__ == '__main__':
    main()