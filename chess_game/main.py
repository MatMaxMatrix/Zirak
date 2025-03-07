import tkinter as tk
from logic.board import Board
from logic.ai import AI
from gui.board_renderer import BoardRenderer
from persistence import Persistence

class ChessGame:
    def __init__(self, master, ai_enabled=False):
        self.master = master
        self.master.title("Chess Game")
        self.board = Board()
        self.ai_enabled = ai_enabled
        self.ai = AI('black') if ai_enabled else None
        self.current_turn = 'white'
        self.renderer = BoardRenderer(master, self.board)

        # Add buttons for saving and loading games
        self.save_button = tk.Button(master, text="Save Game", command=self.save_game)
        self.save_button.pack()
        self.load_button = tk.Button(master, text="Load Game", command=self.load_game)
        self.load_button.pack()

        self.start_game()

    def save_game(self):
        Persistence.save_game('saved_game.json', self.board.board, self.current_turn, self.ai_enabled)

    def load_game(self):
        board_state, current_turn, ai_enabled = Persistence.load_game('saved_game.json')
        if board_state:
            self.board.board = board_state
            self.current_turn = current_turn
            self.ai_enabled = ai_enabled
            self.renderer.place_pieces()

    def start_game(self):
        if self.ai_enabled and self.current_turn == self.ai.color:
            self.master.after(1000, self.ai_move)

    def switch_turn(self):
        self.current_turn = 'black' if self.current_turn == 'white' else 'white'
        if self.ai_enabled and self.current_turn == self.ai.color:
            self.master.after(1000, self.ai_move)

    def ai_move(self):
        move = self.ai.make_move(self.board.board)
        if move:
            from_pos, to_pos = move
            self.board.move_piece(from_pos, to_pos)
            self.renderer.place_pieces()
            self.switch_turn()

    def player_move(self, from_pos, to_pos):
        if self.current_turn == 'white':
            if self.board.validate_move(from_pos, to_pos):
                self.board.move_piece(from_pos, to_pos)
                self.renderer.place_pieces()
                self.switch_turn()

if __name__ == "__main__":
    root = tk.Tk()
    game_type = input("Enter '1' for Player vs Player or '2' for Player vs AI: ")
    ai_enabled = game_type.strip() == '2'
    game = ChessGame(root, ai_enabled=ai_enabled)
    root.mainloop()
