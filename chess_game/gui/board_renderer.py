import tkinter as tk
from tkinter import Canvas

class BoardRenderer:
    def __init__(self, master, board):
        self.master = master
        self.canvas = Canvas(self.master, width=480, height=480)
        self.canvas.pack()
        self.board = board
        self.selected_piece = None
        self.highlighted_moves = []
        self.draw_board()
        self.place_pieces()
        self.canvas.bind("<Button-1>", self.on_click)

    def draw_board(self):
        self.colors = ["#DDB88C", "#A66D4F"]
        for row in range(8):
            for col in range(8):
                color = self.colors[(row+col) % 2]
                self.canvas.create_rectangle(col*60, row*60, (col+1)*60, (row+1)*60, fill=color, tags=f"{row}-{col}")

    def place_pieces(self):
        self.canvas.delete("piece")
        pieces = self.board.board
        for row in range(8):
            for col in range(8):
                piece = pieces[row][col]
                if piece:
                    x = col * 60 + 30
                    y = row * 60 + 30
                    self.canvas.create_text(x, y, text=piece.__class__.__name__[0], font=("Arial", 24), tags=("piece", f"{row}-{col}"))

    def highlight_legal_moves(self, moves):
        for move in moves:
            row, col = move
            self.highlighted_moves.append(self.canvas.create_rectangle(col*60, row*60, (col+1)*60, (row+1)*60, fill="yellow", stipple="gray50", tags="highlight"))

    def clear_highlights(self):
        for tag in self.highlighted_moves:
            self.canvas.delete(tag)
        self.highlighted_moves = []

    def on_click(self, event):
        col = event.x // 60
        row = event.y // 60
        piece = self.board.board[row][col]
        if self.selected_piece:
            # Move the piece if legal
            self.clear_highlights()
            if (row, col) in self.selected_piece.get_legal_moves((self.selected_piece_row, self.selected_piece_col), self.board):
                self.board.move_piece((self.selected_piece_row, self.selected_piece_col), (row, col))
                self.place_pieces()
            self.selected_piece = None
        elif piece and piece.color == self.board.current_turn:
            self.selected_piece = piece
            self.selected_piece_row, self.selected_piece_col = row, col
            self.highlight_legal_moves(piece.get_legal_moves((row, col), self.board))

    def animate_move(self, from_pos, to_pos):
        # Placeholder for animation
        pass
