import "./tictactoe.css"

type Mark = "X" | "O";
type Cell = Mark | null;
type Mode = "pvp" | "bot";
type GameResult = "win" | "draw" | null;

interface GameOverInfo {
  result: GameResult;
  winner: Mark | null;
  line: number[] | null;
}

class TicTacToe {
  /** The 8 possible winning combinations (indices 0-8, row-major order). */
  private static readonly WINNING_LINES: readonly number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  private static readonly BOT_MOVE_DELAY_MS = 400;

  private readonly cells: HTMLTableCellElement[];
  private readonly statusEl: HTMLElement | null;
  private readonly modeButtons: HTMLButtonElement[];
  private readonly firstButtons: HTMLButtonElement[];
  private readonly resetButton: HTMLButtonElement | null;

  private board: Cell[] = Array(9).fill(null);
  private currentPlayer: Mark = "X";
  private mode: Mode = "pvp";
  private firstPlayer: Mark = "X";
  private gameOver = false;
  private botThinking = false;

  private get humanSymbol(): Mark {
    return this.firstPlayer;
  }

  private get botSymbol(): Mark {
    return this.firstPlayer === "X" ? "O" : "X";
  }

  constructor(rootSelector: string) {
    const root = document.querySelector<HTMLElement>(rootSelector)!;
    const table = root.querySelector<HTMLTableElement>("table.tictactoe")!;

    this.cells = Array.from(table.querySelectorAll<HTMLTableCellElement>("td"));
    this.statusEl = root.querySelector<HTMLElement>("[data-status]");
    this.modeButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-mode]")
    );
    this.firstButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-first]")
    );
    this.resetButton = root.querySelector<HTMLButtonElement>('[data-action="reset"]');

    if (this.cells.length !== 9) {
      throw new Error(`TicTacToe: expected 9 cells, found ${this.cells.length}`);
    }

    this.readInitialBoard();
    this.bindEvents();
    this.setMode(this.mode);
    this.updateFirstButtons();
  }

  private readInitialBoard(): void {
    this.cells.forEach((cell, index) => {
      if (cell.querySelector(".mark--x")) {
        this.board[index] = "X";
      } else if (cell.querySelector(".mark--o")) {
        this.board[index] = "O";
      }
    });
  }

  private bindEvents(): void {
    this.cells.forEach((cell, index) => {
      cell.addEventListener("click", () => this.handleCellClick(index));
    });

    this.modeButtons.forEach((button) => {
      const mode = button.dataset.mode as Mode | undefined;
      if (!mode) return;
      button.addEventListener("click", () => this.setMode(mode));
    });

    this.firstButtons.forEach((button) => {
      const first = button.dataset.first as Mark | undefined;
      if (!first) return;
      button.addEventListener("click", () => this.setFirstPlayer(first));
    });

    this.resetButton?.addEventListener("click", () => this.reset());
  }

  public setMode(mode: Mode): void {
    this.mode = mode;
    this.updateModeButtons();
    this.reset();
  }


  public setFirstPlayer(first: Mark): void {
    this.firstPlayer = first;
    this.updateFirstButtons();
    this.reset();
  }

  public reset(): void {
    this.board = Array(9).fill(null);
    this.currentPlayer = this.firstPlayer;
    this.gameOver = false;
    this.botThinking = false;

    this.cells.forEach((cell) => {
      cell.innerHTML = "";
      cell.classList.remove("tictactoe__win");
    });

    this.updateStatus();
  }


  private handleCellClick(index: number): void {
    if (this.gameOver || this.botThinking) return;
    if (this.board[index] !== null) return;

    // In bot mode the human only plays on their own turn.
    if (this.mode === "bot" && this.currentPlayer !== this.humanSymbol) return;

    this.playMove(index, this.currentPlayer);
  }

  private playMove(index: number, symbol: Mark): void {
    this.board[index] = symbol;
    this.renderCell(index, symbol);

    const outcome = this.evaluateBoard(this.board);
    if (outcome.result) {
      this.endGame(outcome);
      return;
    }

    this.currentPlayer = symbol === "X" ? "O" : "X";
    this.updateStatus();

    if (this.mode === "bot" && this.currentPlayer === this.botSymbol) {
      this.triggerBotMove();
    }
  }

  private triggerBotMove(): void {
    this.botThinking = true;
    window.setTimeout(() => {
      const index = this.getBestMove(this.board);
      this.botThinking = false;
      if (index !== -1 && !this.gameOver) {
        this.playMove(index, this.botSymbol);
      }
    }, TicTacToe.BOT_MOVE_DELAY_MS);
  }

  private endGame(outcome: GameOverInfo): void {
    this.gameOver = true;

    if (outcome.line) {
      outcome.line.forEach((index) => {
        this.cells[index].classList.add("tictactoe__win");
      });
    }

    this.updateStatus(outcome);
  }

  private evaluateBoard(board: Cell[]): GameOverInfo {
    for (const line of TicTacToe.WINNING_LINES) {
      const [a, b, c] = line;
      const symbol = board[a];
      if (symbol && symbol === board[b] && symbol === board[c]) {
        return { result: "win", winner: symbol, line };
      }
    }

    if (board.every((cell) => cell !== null)) {
      return { result: "draw", winner: null, line: null };
    }

    return { result: null, winner: null, line: null };
  }

  private getAvailableMoves(board: Cell[]): number[] {
    return board.reduce<number[]>((moves, cell, index) => {
      if (cell === null) moves.push(index);
      return moves;
    }, []);
  }

  private getBestMove(board: Cell[]): number {
    let bestScore = -Infinity;
    let bestMove = -1;

    for (const move of this.getAvailableMoves(board)) {
      board[move] = this.botSymbol;
      const score = this.minimax(board, 0, false, -Infinity, Infinity);
      board[move] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private minimax(
    board: Cell[],
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number
  ): number {
    const outcome = this.evaluateBoard(board);

    if (outcome.result === "win") {
      const score = outcome.winner === this.botSymbol ? 10 - depth : depth - 10;
      return score;
    }
    if (outcome.result === "draw") {
      return 0;
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of this.getAvailableMoves(board)) {
        board[move] = this.botSymbol;
        maxScore = Math.max(maxScore, this.minimax(board, depth + 1, false, alpha, beta));
        board[move] = null;
        alpha = Math.max(alpha, maxScore);
        if (beta <= alpha) break;
      }
      return maxScore;
    }

    let minScore = Infinity;
    for (const move of this.getAvailableMoves(board)) {
      board[move] = this.humanSymbol;
      minScore = Math.min(minScore, this.minimax(board, depth + 1, true, alpha, beta));
      board[move] = null;
      beta = Math.min(beta, minScore);
      if (beta <= alpha) break;
    }
    return minScore;
  }

  private renderCell(index: number, symbol: Mark): void {
    const cell = this.cells[index];
    const mark = document.createElement("span");
    mark.className = symbol === "X" ? "mark mark--x" : "mark mark--o";
    cell.innerHTML = "";
    cell.appendChild(mark);
  }

  private updateModeButtons(): void {
    this.modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === this.mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  private updateFirstButtons(): void {
    this.firstButtons.forEach((button) => {
      const isActive = button.dataset.first === this.firstPlayer;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  private updateStatus(outcome?: GameOverInfo): void {
    if (!this.statusEl) return;

    if (outcome?.result === "win") {
      const winnerLabel =
        this.mode === "bot"
          ? outcome.winner === this.humanSymbol
            ? "You win!"
            : "Bot wins."
          : `${outcome.winner} wins!`;
      this.statusEl.textContent = winnerLabel;
      return;
    }

    if (outcome?.result === "draw") {
      this.statusEl.textContent = "It's a draw.";
      return;
    }

    if (this.mode === "bot") {
      this.statusEl.textContent =
        this.currentPlayer === this.humanSymbol
          ? `Your turn (${this.humanSymbol})`
          : "Thinking...";
    } else {
      this.statusEl.textContent = `${this.currentPlayer}'s turn`;
    }
  }
}


export function load(): void {
  const tictactoePage = document.querySelector('[data-page="games.tictactoe"]');
  if (tictactoePage) {
    new TicTacToe('[data-page="games.tictactoe"]');
  }
}

export { TicTacToe };
export type { Mode, Mark, Cell };