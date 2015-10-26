var players = { WHITE: 'white', BLACK: 'black', EMPTY: 'empty' };

function Game (_opts) {
  var opts = _opts || {};

  // Options
  this.size = opts.size || 19;
  if (opts.goban) {
    opts.gobanOptions = opts.gobanOptions || {};
    opts.gobanOptions.size = this.size;
    this.goban = new Goban(opts.gobanOptions);
    this.goban.game = this;
  }
  this.board = [];
  for (var i = 0; i < this.size; i += 1) {
    this.board[i] = [];
    for (var j = 0; j < this.size; j += 1) {
      this.board[i][j] = players.EMPTY;
    }
  }

  this.currentPlayer = players.BLACK;
  // TODO: handle handicap here

}


Game.prototype.play = function (player, x, y) {
  if (! this.isMoveValid(player, x, y)) { return; }

  this.board[x][y] = player;
  this.currentPlayer = this.currentPlayer === players.BLACK ? players.WHITE : players.BLACK;

  if (this.goban) {
    this.goban.drawStone(player, x, y);
  }
};


Game.prototype.isMoveValid = function (player, x, y) {
  if (this.board[x][y] !== players.EMPTY) { return false; }

  return true;
};



