import pygame
import os

class Skins:
    def __init__(self, theme='default'):
        self.theme = theme
        self.asset_path = 'assets/skins'
        self.snake_skin = None
        self.background = None
        self.load_assets()

    def load_assets(self):
        theme_path = os.path.join(self.asset_path, self.theme)
        try:
            self.snake_skin = pygame.image.load(os.path.join(theme_path, 'snake.png')).convert_alpha()
            self.background = pygame.image.load(os.path.join(theme_path, 'background.png')).convert()
        except pygame.error as e:
            print(f'Failed to load theme assets: {e}')
            self.snake_skin = pygame.Surface((10, 10))  # Fallback
            self.background = pygame.Surface((800, 600))

    def apply_background(self, display):
        display.blit(self.background, (0, 0))

    def draw_snake(self, display, snake_list, snake_block):
        for pos in snake_list:
            display.blit(self.snake_skin, (pos[0], pos[1]), (0, 0, snake_block, snake_block))