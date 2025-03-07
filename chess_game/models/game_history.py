import json

class GameHistory:
    def __init__(self):
        self.history = []

    def record_move(self, move):
        self.history.append(move)

    def undo_move(self):
        if self.history:
            return self.history.pop()
        return None

    def save_game(self, file_path):
        try:
            with open(file_path, 'w') as file:
                json.dump(self.history, file)
            return True
        except IOError as e:
            print(f"Error saving game: {e}")
            return False

    def load_game(self, file_path):
        try:
            with open(file_path, 'r') as file:
                self.history = json.load(file)
            return True
        except (IOError, json.JSONDecodeError) as e:
            print(f"Error loading game: {e}")
            return False

    def display_history(self):
        for i, move in enumerate(self.history):
            print(f"{i + 1}. {move}")

if __name__ == '__main__':
    game_history = GameHistory()
    game_history.record_move("e2 to e4")
    game_history.record_move("e7 to e5")
    game_history.display_history()
    game_history.undo_move()
    game_history.display_history()
    game_history.save_game('game_save.json')
    game_history.load_game('game_save.json')
    game_history.display_history()
