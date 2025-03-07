class Piece:
    def __init__(self, color):
        self.color = color

    def get_legal_moves(self, position, board):
        # Return a list of legal moves for this piece
        pass

class Pawn(Piece):
    def get_legal_moves(self, position, board):
        # Implement pawn-specific legal moves
        pass

class Rook(Piece):
    def get_legal_moves(self, position, board):
        # Implement rook-specific legal moves
        pass

class Knight(Piece):
    def get_legal_moves(self, position, board):
        # Implement knight-specific legal moves
        pass

class Bishop(Piece):
    def get_legal_moves(self, position, board):
        # Implement bishop-specific legal moves
        pass

class Queen(Piece):
    def get_legal_moves(self, position, board):
        # Implement queen-specific legal moves
        pass

class King(Piece):
    def get_legal_moves(self, position, board):
        # Implement king-specific legal moves
        pass
