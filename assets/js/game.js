/*
 * Public API
 * * game.playStone(x, y) - have current player play a stone at x, y
 * * game.pass() - have current player pass
 * * game.isMoveValid(x, y) - can the current player play a stone at x, y
 * * game.canPlay() - are there still moves to be played in the current branch
 * * game.currentPlayer
 * * game.getOppositePlayer(player[optional]) - if player specified, get his opponent, otherwise get the current player's opponent
 *
 * Events emitted and payload
 * * movePlayed - a requested valid move was actually played and the game state updated
 *              { player, pass=[true|false|undefined], finished[true|false|undefined], x[optional], y[optional], moveNumber[0 means empty board] }
 *
 * * captured.change - The number of captured stones for one player changed, send the amount and corresponding player
 *                   { player, captured }
 *
 * * intersection.cleared - An intersection was cleared
 *                        { x, y }
 *
 * * board.cleared - The board was cleared
 */


function Game (_opts) {
  var opts = _opts || {};

  // Options
  this.size = opts.size || 19;

  this.listeners = {};
  this.initialize(true);
}

Game.players = { WHITE: 'white', BLACK: 'black', EMPTY: 'empty' };
Game.moves = { PASS: 'pass', END: 'end' };


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
  delete this.currentKo;   // Necessary for reinitializations
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


/*
 * If player specified, get his opponent, otherwise get the current player's opponent
 */
Game.prototype.getOppositePlayer = function (player) {
  if (player) {
    return player === Game.players.BLACK ? Game.players.WHITE : Game.players.BLACK;
  } else {
    return this.currentPlayer === Game.players.BLACK ? Game.players.WHITE : Game.players.BLACK;
  }
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


/*
 * Play a non-pass move (put a stone on the board)
 */
Game.prototype.playStone = function (x, y) {
  var self = this;

  if (!this.canPlay()) { return; }
  if (! this.isMoveValid(x, y)) { return; }

  // Check we are not breaking out of the current branch, forget it if it is the case
  if (this.moves.length > this.currentMove && (this.moves[this.currentMove].x !== x || this.moves[this.currentMove].y !== y)) {
    this.moves = this.moves.slice(0, this.currentMove);
  }

  if (this.currentKo) {
    this.emit('intersection.cleared', { x: this.currentKo.x, y: this.currentKo.y });
    delete this.currentKo;
  }

  var capturedStones = this.stonesCapturedByMove(x, y);
  capturedStones.forEach(function (stone) {
    self.board[stone.x][stone.y] = Game.players.EMPTY;
    self.emit('intersection.cleared', { x: stone.x, y: stone.y });
  });
  this.captured[this.currentPlayer] += capturedStones.length;
  this.emit('captured.change', { player: this.currentPlayer, captured: this.captured[this.currentPlayer] });

  // Actually play the move
  this.board[x][y] = this.currentPlayer;
  this.moves[this.currentMove] = { x: x, y: y };
  this.currentMove += 1;
  this.emit('movePlayed', { moveNumber: this.currentMove, x: x, y: y, player: this.currentPlayer });

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

  // Move played, switch to next player
  this.currentPlayer = this.getOppositePlayer();
};


/*
 * Pass
 */
Game.prototype.pass = function () {
  if (!this.canPlay()) { return; }   // Nothing to play or replay

  var finished = false, move;

  // TODO: handle duplication with playStone
  if (this.currentKo) {
    this.emit('intersection.cleared', { x: this.currentKo.x, y: this.currentKo.y });
    delete this.currentKo;
  }

  // Decide whether this pass finished the game
  if (this.currentMove === 0 || (this.moves[this.currentMove - 1] !== Game.moves.END && this.moves[this.currentMove - 1] !== Game.moves.PASS)) {
    move = Game.moves.PASS;
  } else {
    move = Game.moves.END;
    finished = true;
  }

  // Check we are not breaking out of the current branch, forget it if it is the case
  // TODO: handle duplication with playStone
  if (this.moves.length > this.currentMove && (this.moves[this.currentMove] !== move)) {
    this.moves = this.moves.slice(0, this.currentMove);
  }

  // Actually play the move
  this.moves[this.currentMove] = move;
  this.currentMove += 1;
  this.emit('movePlayed', { moveNumber: this.currentMove, player: this.currentPlayer, pass: true, finished: finished });

  this.currentPlayer = this.getOppositePlayer();
};


/*
 * Tells whether you can still play in that game branch
 */
Game.prototype.canPlay = function () {
  return (this.currentMove === 0 || this.moves[this.currentMove - 1] !== Game.moves.END);
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

  if (n > this.moves.length) { return; }

  this.emit('board.cleared');
  this.initialize();

  this.emit('movePlayed', { currentMove: 0, player: this.getOppositePlayer() });   // A bit dirty but it can be seen that way :)
  for (var i = 0; i < n; i += 1) {
    if (this.moves[i] === Game.moves.PASS || this.moves[i] === Game.moves.END) {
      this.pass();
    } else {
      this.playStone(this.moves[i].x, this.moves[i].y);
    }
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
