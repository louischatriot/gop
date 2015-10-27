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

  this.listeners = {};

  this.initialize(true);
}

Game.players = { WHITE: 'white', BLACK: 'black', EMPTY: 'empty' };


/*
 * Hard initialization will also forget all played moves while soft reinitializes only the state
 */
Game.prototype.initialize = function (hard) {
  this.board = [];
  for (var i = 0; i < this.size; i += 1) {
    this.board[i] = [];
    for (var j = 0; j < this.size; j += 1) {
      this.board[i][j] = Game.players.EMPTY;
    }
  }

  this.currentPlayer = Game.players.BLACK;
  // TODO: handle handicap here

  this.captured = {};
  this.captured[Game.players.BLACK] = 0;
  this.captured[Game.players.WHITE] = 0;

  if (hard) { this.moves = []; }
  this.currentMove = 0;   // Move 0 is empty board
};

Game.prototype.on = function(evt, listener) {
  if (!this.listeners[evt]) { this.listeners[evt] = []; }
  this.listeners[evt].push(listener);
};

Game.prototype.emit = function (evt, message) {
  if (this.listeners[evt]) {
    this.listeners[evt].forEach(function (fn) { fn(message); });
  }
};


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
  return this.currentPlayer === Game.players.BLACK ? Game.players.WHITE : Game.players.BLACK;
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

  // Check we are not breaking out of the current branch, forget it if it is the case
  if (this.moves.length > this.currentMove && (this.moves[this.currentMove].x !== x || this.moves[this.currentMove].y !== y)) {
    this.moves = this.moves.slice(0, this.currentMove);    
  }

  if (this.currentKo) {
    if (this.goban) { this.goban.removeStone(this.currentKo.x, this.currentKo.y); } 
    this.currentKo = null;
  }

  var capturedStones = this.stonesCapturedByMove(x, y);
  capturedStones.forEach(function (stone) {
    self.board[stone.x][stone.y] = Game.players.EMPTY;
    if (self.goban) { self.goban.removeStone(stone.x, stone.y); }
  });
  this.captured[this.currentPlayer] += capturedStones.length;
  this.emit('captured.change', { player: this.currentPlayer, captured: this.captured[this.currentPlayer] });

  // Actually play the move
  this.board[x][y] = this.currentPlayer;
  this.moves.push({ x: x, y: y });
  this.currentMove += 1;
  this.emit('currentMove.change', { currentMove: this.currentMove });
  if (this.goban) {
    this.goban.drawStone(this.currentPlayer, x, y);
  }
  
  // Handle Ko situations
  if (capturedStones.length === 1) {
    var capturingGroup = this.getGroup(x, y);
    if (capturingGroup.length === 1) {
      var capturingGroupLiberties = this.groupLiberties(capturingGroup);
      if (capturingGroupLiberties.length === 1 && capturingGroupLiberties[0].x === capturedStones[0].x && capturingGroupLiberties[0].y === capturedStones[0].y) {
        this.currentKo = { x: capturedStones[0].x, y: capturedStones[0].y };
        if (this.goban) {
          this.goban.drawStone('square', this.currentKo.x, this.currentKo.y);
        }
      }
    }
  }

  // Move played, switch to next player
  this.currentPlayer = this.getOppositePlayer();
  this.emit('currentPlayer.change', { currentPlayer: this.currentPlayer });
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
  if (this.board[x][y] !== Game.players.EMPTY) { return false; }

  // Prevent playing a Ko
  if (this.currentKo && this.currentKo.x === x && this.currentKo.y === y) { return false; }

  // Check whether we are capturing an opposite group
  if (this.stonesCapturedByMove(x, y).length > 0) { return true; }
  
  // Check whether this move is a sacrifice
  this.board[x][y] = this.currentPlayer;   // Not very clean but much smaller and scoped anyway
  if (this.groupLiberties(this.getGroup(x, y)).length === 0) {
    this.board[x][y] = Game.players.EMPTY;
    return false;
  } else {
    this.board[x][y] = Game.players.EMPTY;
    return true;
  }

  return true;
};


/*
 * Get list of opposite stones that will be captured by the move, without actually playing it
 * Will work whether the move has already been played or not
 * No duplicates in the list
 */
Game.prototype.stonesCapturedByMove = function (x, y) {
  var _captures = {}
    , captures = []
    , self = this;

  this.adjacentIntersections(x, y).forEach(function (i) {
    if (self.board[i.x][i.y] === self.getOppositePlayer()) {
      var oppositeGroup = self.getGroup(i.x, i.y);
      var oppositeLiberties = self.groupLiberties(oppositeGroup);
      if (oppositeLiberties.length === 0 || (oppositeLiberties.length === 1 && oppositeLiberties[0].x === x && oppositeLiberties[0].y === y)) {
        //captures = captures.concat(oppositeGroup);
        oppositeGroup.forEach(function (i) {
          _captures[i.x + '-' + i.y] = { x: i.x, y: i.y };
        });
      }
    }
  });

  Object.keys(_captures).forEach(function (k) { captures.push(_captures[k]); });
  return captures;
};


/*
 * Get the group (x, y) is part of, without duplicate.
 * Linear in the number of board intersactions.
 * Return an empty list if intersection is empty or out of bounds.
 */
Game.prototype.getGroupInternal = function (marks, player, x, y) {
  var group = [{ x: x, y: y }];
  marks[x][y] = Game.players.EMPTY;

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
  if (player === Game.players.EMPTY) { return []; }

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
      if (marks[i.x][i.y] === Game.players.EMPTY) {
        liberties.push({ x: i.x, y: i.y });
        marks[i.x][i.y] = Game.players.BLACK;
      }
    });
  });

  return liberties;
};


/*
 * For now variations are not possible. If a variation is played the game will forget about the previous branch (see play function).
 */
Game.prototype.backToMove = function (n) {
  var i, j;

  if (n >= this.moves.length) { return; }

  if (this.goban) { this.goban.removeAllStones(); }
  this.initialize();

  for (var i = 0; i < n; i += 1) {
    this.play(this.moves[i].x, this.moves[i].y);
  }

};

Game.prototype.back = function () {
  this.backToMove(this.currentMove - 1);
};

Game.prototype.next = function () {
  this.backToMove(this.currentMove + 1);
};



// Code shared on the server.
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') { module.exports = Game; }
