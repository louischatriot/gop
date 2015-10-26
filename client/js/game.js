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


Game.prototype.cloneBoard = function () {
  var res = [];
  for (var i = 0; i < this.size; i += 1) {
    res[i] = [];
    for (var j = 0; j < this.size; j += 1) {
      res[i][j] = this.board[i][j];
    }
  }
  return res;
};


Game.prototype.getOppositePlayer = function () {
  return this.currentPlayer === players.BLACK ? players.WHITE : players.BLACK;
};


// Works with coordinates or directly a point pair
Game.prototype.adjacentIntersections = function (x, y) {
  var res = [];

  if (typeof x !== 'number') { y = x.y; x = x.x; }

  if (x > 0) { res.push({ x: x-1, y: y }); }
  if (y > 0) { res.push({ x: x, y: y-1 }); }
  if (x < this.size - 1) { res.push({ x: x+1, y: y }); }
  if (y < this.size - 1) { res.push({ x: x, y: y+1 }); }

  return res;
};


Game.prototype.play = function (x, y) {
  var self = this;

  if (! this.isMoveValid(x, y)) { return; }

  this.stonesCapturedByMove(x, y).forEach(function (stone) {
    self.board[stone.x][stone.y] = players.EMPTY;
    if (self.goban) { self.goban.removeStone(stone.x, stone.y); }
  });

  this.board[x][y] = this.currentPlayer;
  if (this.goban) {
    this.goban.drawStone(this.currentPlayer, x, y);
  }

  // Move played, switch to next player
  this.currentPlayer = this.getOppositePlayer();
};


/*
 * Checks whether the move can be played, leaving the board and goban unchanged
 */
Game.prototype.isMoveValid = function (x, y) {
  var oppositeGroup, oppositeLiberties
    , oppositePlayer = this.getOppositePlayer()
    , capturesHappened = false
    , self = this
    ;

  // Check we are not playing on top of another stone
  if (this.board[x][y] !== players.EMPTY) { return false; }

  // Check whether we are capturing an opposite group
  if (this.stonesCapturedByMove(x, y).length > 0) { return true; }
  
  // Check whether this move is a sacrifice
  this.board[x][y] = this.currentPlayer;   // Not very clean but much smaller and scoped anyway
  if (this.groupLiberties(this.getGroup(x, y)).length === 0) {
    this.board[x][y] = players.EMPTY;
    return false;
  } else {
    this.board[x][y] = players.EMPTY;
    return true;
  }

  return true;
};


/*
 * Get list of opposite stones that will be captured by the move, without actually playing it
 * Will work whether the move has already been played or not
 */
Game.prototype.stonesCapturedByMove = function (x, y) {
  var captures = []
    , self = this;

  this.adjacentIntersections(x, y).forEach(function (i) {
    if (self.board[i.x][i.y] === self.getOppositePlayer()) {
      var oppositeGroup = self.getGroup(i.x, i.y);
      var oppositeLiberties = self.groupLiberties(oppositeGroup);
      if (oppositeLiberties.length === 0 || (oppositeLiberties.length === 1 && oppositeLiberties[0].x === x && oppositeLiberties[0].y === y)) {
        captures = captures.concat(oppositeGroup);
      }
    }
  });

  return captures;
};


/*
 * Get the group (x, y) is part of, without duplicate.
 * Linear in the number of board intersactions.
 * Return an empty list if intersection is empty or out of bounds.
 */
Game.prototype.getGroupInternal = function (marks, player, x, y) {
  var group = [{ x: x, y: y }];
  marks[x][y] = players.EMPTY;

  var self = this;
  this.adjacentIntersections(x, y).forEach(function (i) {
    if (marks[i.x][i.y] === player) {
      group = group.concat(self.getGroupInternal(marks, player, i.x, i.y));
    }
  });

  return group;
};

Game.prototype.getGroup = function (x, y) {
  if (x < 0 || y < 0 || x >= this.size || y >= this.size) { return []; }
  var player = this.board[x][y];
  if (player === players.EMPTY) { return []; }

  var marks = this.cloneBoard();
  return this.getGroupInternal(marks, player, x, y);
};


/*
 * Given a group as a list of intersections, return the list of liberties
 */
Game.prototype.groupLiberties = function (group) {
  var marks = this.cloneBoard()
    , liberties = []
    , self = this
    ;

  group.forEach(function(stone) {
    self.adjacentIntersections(stone).forEach(function (i) {
      if (marks[i.x][i.y] === players.EMPTY) {
        liberties.push({ x: i.x, y: i.y });
        marks[i.x][i.y] = players.BLACK;
      }
    });
  });

  return liberties;
};







