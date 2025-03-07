import json

class Persistence:
    @staticmethod
    def save_game(file_path, board_state, current_turn, ai_enabled):
        game_data = {
            'board': [[piece.__class__.__name__[0] if piece else None for piece in row] for row in board_state],
            'current_turn': current_turn,
            'ai_enabled': ai_enabled
        }
        try:
            with open(file_path, 'w') as file:
                json.dump(game_data, file)
        except IOError as e:
            print(f"An error occurred while saving the game: {e}")

    @staticmethod
    def load_game(file_path):
        try:
            with open(file_path, 'r') as file:
                game_data = json.load(file)
                return game_data['board'], game_data['current_turn'], game_data['ai_enabled']
        except (IOError, json.JSONDecodeError) as e:
            print(f"An error occurred while loading the game: {e}")
            return None, None, None
