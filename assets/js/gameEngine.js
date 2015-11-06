/*
 * Public API
 * * gameEngine.play(move) - have current player play move, which can be placing a stone {x, y}, passing or resigning
 * * gameEngine.playStone(x, y) - have current player play a stone at x, y
 * * gameEngine.pass() - have current player pass
 * * gameEngine.resign() - have the current player resign
 * * gameEngine.isMoveValid(x, y) - can the current player play a stone at x, y
 * * gameEngine.isGameFinished() - is the game finished in the current branch
 * * gameEngine.currentPlayer
 * * gameEngine.getOppositePlayer(player[optional]) - if player specified, get his opponent, otherwise get the current player's opponent
 *
 * Events emitted and payload
 * * movePlayed - a requested valid move was actually played and the gameEngine state updated. The event is fired after the gameEngine state is fully up to date
 *              { player, moveNumber[0 means initial board], move[{x,y}|PASS|RESIGN] }
 *
 * * captured.change - The number of captured stones for one player changed, send the amount and corresponding player
 *                   { player, captured }
 *
 * * intersection.cleared - An intersection was cleared
 *                        { x, y }
 *
 * * board.cleared - The board was cleared
 */


function GameEngine (_opts) {
  var opts = _opts || {};

  // Options
  this.size = opts.size || 19;

  this.listeners = {};
  this.initialize(true);
}

GameEngine.players = { WHITE: 'white', BLACK: 'black', EMPTY: 'empty' };
GameEngine.moves = { PASS: 'pass', RESIGN: 'resign' };


/*
 * Hard initialization will also forget all played moves while soft reinitializes only the state
 */
GameEngine.prototype.initialize = function (hard) {
  this.board = [];
  for (var i = 0; i < this.size; i += 1) {
    this.board[i] = [];
    for (var j = 0; j < this.size; j += 1) {
      this.board[i][j] = GameEngine.players.EMPTY;
    }
  }

  this.currentPlayer = GameEngine.players.BLACK;
  // TODO: handle handicap here

  this.captured = {};
  this.captured[GameEngine.players.BLACK] = 0;
  this.captured[GameEngine.players.WHITE] = 0;

  if (hard) { this.moves = []; }
  this.currentMove = 0;   // Move 0 is empty board
  delete this.currentKo;   // Necessary for reinitializations
};

GameEngine.prototype.on = function(evt, listener) {
  if (!this.listeners[evt]) { this.listeners[evt] = []; }
  this.listeners[evt].push(listener);
};

GameEngine.prototype.emit = function (evt, message) {
  if (this.listeners[evt]) {
    this.listeners[evt].forEach(function (fn) { fn(message); });
  }
};


GameEngine.prototype.cloneBoard = function () {
  var res = [];
  for (var i = 0; i < this.size; i += 1) {
    res[i] = [];
    for (var j = 0; j < this.size; j += 1) {
      res[i][j] = this.board[i][j];
    }
  }
  return res;
};


/*
 * If player specified, get his opponent, otherwise get the current player's opponent
 */
GameEngine.prototype.getOppositePlayer = function (player) {
  if (player) {
    return player === GameEngine.players.BLACK ? GameEngine.players.WHITE : GameEngine.players.BLACK;
  } else {
    return this.currentPlayer === GameEngine.players.BLACK ? GameEngine.players.WHITE : GameEngine.players.BLACK;
  }
};


// Works with coordinates or directly a point pair
GameEngine.prototype.adjacentIntersections = function (x, y) {
  var res = [];

  if (typeof x !== 'number') { y = x.y; x = x.x; }

  if (x > 0) { res.push({ x: x-1, y: y }); }
  if (y > 0) { res.push({ x: x, y: y-1 }); }
  if (x < this.size - 1) { res.push({ x: x+1, y: y }); }
  if (y < this.size - 1) { res.push({ x: x, y: y+1 }); }

  return res;
};


/*
 * Play a non-pass move (put a stone on the board)
 */
GameEngine.prototype.playStone = function (x, y) {
  var self = this;

  if (typeof x !== 'number' && y === undefined) { y = x.y; x = x.x; }   // playStone({x,y} signature was used

  if (this.isGameFinished()) { return; }
  if (!this.isMoveValid(x, y)) { return; }

  this.removeCurrentKo();
  this.checkMoveForBranch({ x: x, y: y });

  var capturedStones = this.stonesCapturedByMove(x, y);
  capturedStones.forEach(function (stone) {
    self.board[stone.x][stone.y] = GameEngine.players.EMPTY;
    self.emit('intersection.cleared', { x: stone.x, y: stone.y });
  });
  this.captured[this.currentPlayer] += capturedStones.length;
  this.emit('captured.change', { player: this.currentPlayer, captured: this.captured[this.currentPlayer] });


  // Actually play the move
  this.board[x][y] = this.currentPlayer;
  this.moves[this.currentMove] = { x: x, y: y };
  this.currentMove += 1;
  this.currentPlayer = this.getOppositePlayer();
  this.emit('movePlayed', { moveNumber: this.currentMove, player: this.getOppositePlayer(), move: { x: x, y: y } });

  // Handle Ko situations
  if (capturedStones.length === 1) {
    var capturingGroup = this.getGroup(x, y);
    if (capturingGroup.length === 1) {
      var capturingGroupLiberties = this.groupLiberties(capturingGroup);
      if (capturingGroupLiberties.length === 1 && capturingGroupLiberties[0].x === capturedStones[0].x && capturingGroupLiberties[0].y === capturedStones[0].y) {
        this.currentKo = { x: capturedStones[0].x, y: capturedStones[0].y };
        this.emit('ko.new', { x: this.currentKo.x, y: this.currentKo.y });
      }
    }
  }
};


/*
 * Pass
 */
GameEngine.prototype.pass = function () {
  if (this.isGameFinished()) { return; }

  this.removeCurrentKo();
  this.checkMoveForBranch(GameEngine.moves.PASS);

  // Actually play the move
  this.moves[this.currentMove] = GameEngine.moves.PASS;
  this.currentMove += 1;
  this.currentPlayer = this.getOppositePlayer();
  this.emit('movePlayed', { moveNumber: this.currentMove, player: this.getOppositePlayer(), move: GameEngine.moves.PASS });
};


/*
 * Resign
 */
GameEngine.prototype.resign = function () {
  if (this.isGameFinished()) { return; }

  this.removeCurrentKo();
  this.checkMoveForBranch(GameEngine.moves.RESIGN);

  this.moves[this.currentMove] = GameEngine.moves.RESIGN;
  this.currentMove += 1;
  this.currentPlayer = this.getOppositePlayer();   // Not really necessary but more consistent
  this.emit('movePlayed', { moveNumber: this.currentMove, player: this.getOppositePlayer(), move: GameEngine.moves.RESIGN });
};


/**
 * Play a move, can be {x,y}, PASS or RESIGN
 */
GameEngine.prototype.play = function (move) {
  if (move === GameEngine.moves.PASS) {
    this.pass();
  } else if (move === GameEngine.moves.RESIGN) {
    this.resign();
  } else {
    this.playStone(move.x, move.y);
  }
};


/*
 * Tells whether you can still play in that game branch
 */
GameEngine.prototype.isGameFinished = function () {
  if (this.currentMove === 0) { return false; }
  if (this.moves[this.currentMove - 1] === GameEngine.moves.RESIGN) { return true; }
  return (this.currentMove > 1 && this.moves[this.currentMove - 1] === GameEngine.moves.PASS && this.moves[this.currentMove - 2] === GameEngine.moves.PASS);
};


/*
 * Remove current ko if any
 */
GameEngine.prototype.removeCurrentKo = function () {
  if (this.currentKo) {
    this.emit('intersection.cleared', { x: this.currentKo.x, y: this.currentKo.y });
    delete this.currentKo;
  }
};


/*
 * Check whether move breaks out of current branch, forget it if that's the case
 * TODO: handle variations here
 */
GameEngine.prototype.checkMoveForBranch = function(move) {
  if (this.moves.length === this.currentMove) { return; }   // current move is at the head of the moves list so it's not breaking out of any the branch

  if (typeof move.x === 'number' && typeof move.y === 'number') {
    if (this.moves[this.currentMove].x !== move.x || this.moves[this.currentMove].y !== move.y) {
      this.moves = this.moves.slice(0, this.currentMove);
    }
  } else {
    if (this.moves[this.currentMove] !== move) {
      this.moves = this.moves.slice(0, this.currentMove);
    }
  }
};


/*
 * Checks whether the move can be played, leaving the board and goban unchanged
 */
GameEngine.prototype.isMoveValid = function (x, y) {
  var oppositeGroup, oppositeLiberties
    , oppositePlayer = this.getOppositePlayer()
    , capturesHappened = false
    , self = this
    ;

  if (typeof x !== 'number' || typeof y !== 'number') { return false; }

  // Check we are not playing on top of another stone
  if (this.board[x][y] !== GameEngine.players.EMPTY) { return false; }

  // Prevent playing a Ko
  if (this.currentKo && this.currentKo.x === x && this.currentKo.y === y) { return false; }

  // Check whether we are capturing an opposite group
  if (this.stonesCapturedByMove(x, y).length > 0) { return true; }

  // Check whether this move is a sacrifice
  this.board[x][y] = this.currentPlayer;   // Not very clean but much smaller and scoped anyway
  if (this.groupLiberties(this.getGroup(x, y)).length === 0) {
    this.board[x][y] = GameEngine.players.EMPTY;
    return false;
  } else {
    this.board[x][y] = GameEngine.players.EMPTY;
    return true;
  }

  return true;
};


/*
 * Get list of opposite stones that will be captured by the move, without actually playing it
 * Will work whether the move has already been played or not
 * No duplicates in the list
 */
GameEngine.prototype.stonesCapturedByMove = function (x, y) {
  var _captures = {}
    , captures = []
    , self = this;

  this.adjacentIntersections(x, y).forEach(function (i) {
    if (self.board[i.x][i.y] === self.getOppositePlayer()) {
      var oppositeGroup = self.getGroup(i.x, i.y);
      var oppositeLiberties = self.groupLiberties(oppositeGroup);
      if (oppositeLiberties.length === 0 || (oppositeLiberties.length === 1 && oppositeLiberties[0].x === x && oppositeLiberties[0].y === y)) {
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
GameEngine.prototype.getGroupInternal = function (marks, player, x, y) {
  var group = [{ x: x, y: y }];
  marks[x][y] = GameEngine.players.EMPTY;

  var self = this;
  this.adjacentIntersections(x, y).forEach(function (i) {
    if (marks[i.x][i.y] === player) {
      group = group.concat(self.getGroupInternal(marks, player, i.x, i.y));
    }
  });

  return group;
};

GameEngine.prototype.getGroup = function (x, y) {
  if (x < 0 || y < 0 || x >= this.size || y >= this.size) { return []; }
  var player = this.board[x][y];
  if (player === GameEngine.players.EMPTY) { return []; }

  var marks = this.cloneBoard();
  return this.getGroupInternal(marks, player, x, y);
};


/*
 * Given a group as a list of intersections, return the list of liberties
 */
GameEngine.prototype.groupLiberties = function (group) {
  var marks = this.cloneBoard()
    , liberties = []
    , self = this
    ;

  group.forEach(function(stone) {
    self.adjacentIntersections(stone).forEach(function (i) {
      if (marks[i.x][i.y] === GameEngine.players.EMPTY) {
        liberties.push({ x: i.x, y: i.y });
        marks[i.x][i.y] = GameEngine.players.BLACK;
      }
    });
  });

  return liberties;
};


/*
 * For now variations are not possible. If a variation is played the game will forget about the previous branch (see play function).
 */
GameEngine.prototype.backToMove = function (n) {
  var i, j;

  if (n > this.moves.length) { return; }

  this.emit('board.cleared');
  this.initialize();

  this.emit('movePlayed', { currentMove: 0, player: this.getOppositePlayer() });   // A bit dirty but it can be seen that way :)
  for (var i = 0; i < n; i += 1) {
    this.play(this.moves[i]);
  }

};

GameEngine.prototype.back = function () {
  this.backToMove(this.currentMove - 1);
};

GameEngine.prototype.next = function () {
  this.backToMove(this.currentMove + 1);
};


/**
 * Refreshes entire game move tree (signel-branch one)
 * Currently used to synchronize with server
 */
GameEngine.prototype.refreshGameMoves = function (moves) {
  var self = this;
  this.moves = []
  moves.forEach(function (move) { self.moves.push(move); });
  this.backToMove(this.moves.length);
};



// Code shared on the server.
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') { module.exports = GameEngine; }
