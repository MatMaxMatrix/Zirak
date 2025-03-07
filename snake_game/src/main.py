import pygame
import time
import random
from settings import GameSettings
from controls import Controls
from skins import Skins
from gameplay_elements import GameplayElements

# Initialize Pygame
pygame.init()
pygame.mixer.init()

# Colors
white = (255, 255, 255)
yellow = (255, 255, 102)
black = (0, 0, 0)
red = (213, 50, 80)
green = (0, 255, 0)
blue = (50, 153, 213)

# Display dimensions
dis_width = 800
dis_height = 600

dis = pygame.display.set_mode((dis_width, dis_height))
pygame.display.set_caption('Snake Game')

clock = pygame.time.Clock()

font_style = pygame.font.SysFont(None, 50)
score_font = pygame.font.SysFont(None, 35)

# Load sounds
eat_sound = pygame.mixer.Sound('assets/sounds/eat.wav')
game_over_sound = pygame.mixer.Sound('assets/sounds/game_over.wav')

controls = Controls()
skins = Skins(theme='default')
game_elements = GameplayElements(dis_width, dis_height, grid_size=20)


def message(msg, color):
    mesg = font_style.render(msg, True, color)
    dis.blit(mesg, [dis_width / 6, dis_height / 3])


def show_score(score):
    value = score_font.render("Score: " + str(score), True, white)
    dis.blit(value, [0, 0])


def gameLoop(settings):
    game_over = False
    game_close = False

    x1 = dis_width / 2
    y1 = dis_height / 2

    x1_change = 0
    y1_change = 0

    snake_list = []
    length_of_snake = settings.initial_length

    foodx = round(random.randrange(0, dis_width - settings.grid_size) / 10.0) * 10.0
    foody = round(random.randrange(0, dis_height - settings.grid_size) / 10.0) * 10.0

    score = 0

    game_elements.generate_obstacles(5)
    game_elements.generate_power_up()

    while not game_over:

        while game_close == True:
            skins.apply_background(dis)
            message("You Lost! Press Q-Quit or C-Play Again", red)
            pygame.display.update()

            for event in pygame.event.get():
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_q:
                        game_over = True
                        game_close = False
                    if event.key == pygame.K_c:
                        gameLoop(settings)

        direction = controls.get_input()
        if direction == 'LEFT':
            x1_change = -settings.grid_size
            y1_change = 0
        elif direction == 'RIGHT':
            x1_change = settings.grid_size
            y1_change = 0
        elif direction == 'UP':
            y1_change = -settings.grid_size
            x1_change = 0
        elif direction == 'DOWN':
            y1_change = settings.grid_size
            x1_change = 0

        if x1 >= dis_width or x1 < 0 or y1 >= dis_height or y1 < 0:
            game_close = True
            game_over_sound.play()
        x1 += x1_change
        y1 += y1_change
        skins.apply_background(dis)
        pygame.draw.rect(dis, green, [foodx, foody, settings.grid_size, settings.grid_size])
        snake_head = []
        snake_head.append(x1)
        snake_head.append(y1)
        snake_list.append(snake_head)
        if len(snake_list) > length_of_snake:
            del snake_list[0]

        collision_result = game_elements.check_collisions(x1, y1, snake_list)
        if collision_result == 'obstacle':
            game_close = True
            game_over_sound.play()
        elif collision_result == 'speed':
            settings.snake_speed += 5
        elif collision_result == 'invincibility':
            # Implement invincibility logic here
            pass
        elif collision_result == 'shorten':
            length_of_snake = max(1, length_of_snake - 2)

        for x in snake_list[:-1]:
            if x == snake_head:
                game_close = True
                game_over_sound.play()

        skins.draw_snake(dis, snake_list, settings.grid_size)
        show_score(score)

        game_elements.draw_obstacles(dis)
        game_elements.draw_power_ups(dis)

        pygame.display.update()

        if x1 == foodx and y1 == foody:
            foodx = round(random.randrange(0, dis_width - settings.grid_size) / 10.0) * 10.0
            foody = round(random.randrange(0, dis_height - settings.grid_size) / 10.0) * 10.0
            length_of_snake += 1
            score += 1
            eat_sound.play()

        clock.tick(settings.snake_speed)

    pygame.quit()
    quit()

# Setup game settings
game_settings = GameSettings(difficulty='Normal')
gameLoop(game_settings)
