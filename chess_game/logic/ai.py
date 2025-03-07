import random

class AI:
    def __init__(self, color):
        self.color = color

    def make_move(self, board):
        # Simplified random move generator
        legal_moves = self.get_all_legal_moves(board)
        if legal_moves:
            return random.choice(legal_moves)
        return None

    def get_all_legal_moves(self, board):
        # Generate all legal moves for AI's pieces
        legal_moves = []
        for row in range(8):
            for col in range(8):
                piece = board[row][col]
                if piece and piece.color == self.color:
                    legal_moves.extend(piece.get_legal_moves((row, col), board))
        return legal_moves
