import pygame

class Controls:
    def __init__(self):
        pygame.joystick.init()
        self.joysticks = [pygame.joystick.Joystick(i) for i in range(pygame.joystick.get_count())]
        for joystick in self.joysticks:
            joystick.init()

    def get_input(self):
        keys = pygame.key.get_pressed()
        direction = None

        if keys[pygame.K_LEFT]:
            direction = 'LEFT'
        elif keys[pygame.K_RIGHT]:
            direction = 'RIGHT'
        elif keys[pygame.K_UP]:
            direction = 'UP'
        elif keys[pygame.K_DOWN]:
            direction = 'DOWN'

        for event in pygame.event.get():
            if event.type == pygame.JOYAXISMOTION:
                if event.axis == 0:
                    if event.value < -0.5:
                        direction = 'LEFT'
                    elif event.value > 0.5:
                        direction = 'RIGHT'
                elif event.axis == 1:
                    if event.value < -0.5:
                        direction = 'UP'
                    elif event.value > 0.5:
                        direction = 'DOWN'

        return direction