import random

class AIEngine:
    def __init__(self, difficulty='medium'):
        self.difficulty = difficulty

    def choose_move(self, board):
        if self.difficulty == 'easy':
            return self.random_move(board)
        elif self.difficulty == 'medium':
            return self.minimax_move(board, depth=2)
        elif self.difficulty == 'hard':
            return self.minimax_move(board, depth=4)

    def random_move(self, board):
        # Generate a random legal move
        legal_moves = self.get_all_legal_moves(board)
        return random.choice(legal_moves) if legal_moves else None

    def minimax_move(self, board, depth):
        # Implement minimax algorithm here with alpha-beta pruning
        best_move = None
        best_score = float('-inf')
        for move in self.get_all_legal_moves(board):
            # Simulate move
            self.make_move(board, move)
            score = self.minimax(board, depth - 1, False, float('-inf'), float('inf'))
            # Undo move
            self.undo_move(board, move)
            if score > best_score:
                best_score = score
                best_move = move
        return best_move

    def minimax(self, board, depth, maximizing, alpha, beta):
        if depth == 0 or self.is_terminal(board):
            return self.evaluate_board(board)

        if maximizing:
            max_eval = float('-inf')
            for move in self.get_all_legal_moves(board):
                self.make_move(board, move)
                eval = self.minimax(board, depth - 1, False, alpha, beta)
                self.undo_move(board, move)
                max_eval = max(max_eval, eval)
                alpha = max(alpha, eval)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in self.get_all_legal_moves(board):
                self.make_move(board, move)
                eval = self.minimax(board, depth - 1, True, alpha, beta)
                self.undo_move(board, move)
                min_eval = min(min_eval, eval)
                beta = min(beta, eval)
                if beta <= alpha:
                    break
            return min_eval

    def evaluate_board(self, board):
        # Evaluate the board and return a score
        return random.randint(-10, 10)  # Placeholder evaluation

    def get_all_legal_moves(self, board):
        # Return a list of all legal moves for the current board
        return []  # Placeholder

    def make_move(self, board, move):
        # Make a move on the board
        pass

    def undo_move(self, board, move):
        # Undo a move on the board
        pass

    def is_terminal(self, board):
        # Check if the game is in a terminal state
        return False  # Placeholder