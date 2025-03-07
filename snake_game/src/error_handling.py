import logging
import pygame

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

class ErrorHandling:
    def __init__(self):
        self.logger = logging.getLogger()

    def log_error(self, message):
        self.logger.error(message)

    def log_info(self, message):
        self.logger.info(message)

    def handle_event_errors(self, event):
        try:
            # Process event
            pass
        except pygame.error as e:
            self.log_error(f'Pygame error: {e}')
        except Exception as e:
            self.log_error(f'Unhandled exception: {e}')

    def handle_runtime_errors(self):
        try:
            # Run game loop
            pass
        except pygame.error as e:
            self.log_error(f'Pygame runtime error: {e}')
            pygame.quit()
        except Exception as e:
            self.log_error(f'Unhandled runtime exception: {e}')
            pygame.quit()