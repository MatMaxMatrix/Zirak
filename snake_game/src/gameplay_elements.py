import pygame
import random

class GameplayElements:
    def __init__(self, dis_width, dis_height, grid_size):
        self.dis_width = dis_width
        self.dis_height = dis_height
        self.grid_size = grid_size
        self.obstacles = []
        self.power_ups = []

    def generate_obstacles(self, num_obstacles):
        self.obstacles = []
        for _ in range(num_obstacles):
            x = round(random.randrange(0, self.dis_width - self.grid_size) / 10.0) * 10.0
            y = round(random.randrange(0, self.dis_height - self.grid_size) / 10.0) * 10.0
            self.obstacles.append((x, y))

    def generate_power_up(self):
        x = round(random.randrange(0, self.dis_width - self.grid_size) / 10.0) * 10.0
        y = round(random.randrange(0, self.dis_height - self.grid_size) / 10.0) * 10.0
        effect = random.choice(['speed', 'invincibility', 'shorten'])
        self.power_ups.append({'position': (x, y), 'effect': effect})

    def draw_obstacles(self, display):
        for pos in self.obstacles:
            pygame.draw.rect(display, (139, 69, 19), [pos[0], pos[1], self.grid_size, self.grid_size])

    def draw_power_ups(self, display):
        for power_up in self.power_ups:
            pygame.draw.circle(display, (255, 215, 0), (int(power_up['position'][0]), int(power_up['position'][1])), self.grid_size // 2)

    def check_collisions(self, x1, y1, snake_list):
        for obstacle in self.obstacles:
            if x1 == obstacle[0] and y1 == obstacle[1]:
                return 'obstacle'

        for power_up in self.power_ups:
            if x1 == power_up['position'][0] and y1 == power_up['position'][1]:
                self.power_ups.remove(power_up)
                return power_up['effect']

        return None