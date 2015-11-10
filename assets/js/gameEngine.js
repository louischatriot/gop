/**
 * Create new move
 * n is the move number, a unique incremental id that is used to identify a specific move and enable incremental synchronization
 * If type is not specified it is implied to be STONE
 * x and y are needed online for type STONE
 */
function Move (n, type, x, y) {
  this.n = n;
  this.type = type || Move.types.STONE;
  if (typeof x === 'number') { this.x = x; }
  if (typeof y === 'number') { this.y = y; }
  this.depth = 0;
}

Move.types = { STONE: 'stone', PASS: 'pass', RESIGN: 'resign' };


/**
 * Standard tree functions
 */
Move.prototype.isRoot = function () {
  return this.parent === undefined;
};

Move.prototype.hasChildren = function () {
  return this.children && this.children.length > 0;
};

Move.prototype.getDepth = function () {
  return this.depth;   // Still unsure whether depth should be cached in nodes or not
};

/**
 * @param{Boolean} strict Optional, defaults to false. If true test whether this is the same node
 *                        If false only whether this is the same move regardless of place in the tree
 */
Move.prototype.isEqualTo = function (move, strict) {
  if (strict && this.n !== move.n) { return false; }
  if (this.type !== move.type) { return false; }
  if (this.type === Move.types.STONE) {
    return this.x === move.x && this.y === move.y;
  } else {
    return true;
  }
};


/**
 * Add a child to the move, returning the child
 */
Move.prototype.addChild = function (n, type, x, y) {
  if (n.constructor && n.constructor.name === 'Move') { return this.addChild(n.n, n.type, n.x, n.y); }

  if (!this.children) { this.children = []; }

  var child;
  this.children.forEach(function (c) { if (c.isEqualTo(new Move(0, type, x, y), false)) { child = c; } });

  if (!child) {
    child = new Move(n, type, x, y);
    child.parent = this;
    this.children.push(child);
    child.depth = this.depth + 1;
  }

  return child;
};


Move.prototype.createCopy = function () {
  var move = new Move(this.n, this.type, this.x, this.y);

  if (this.children) {
    move.children = [];
    this.children.forEach(function (child) {
      var copy = child.createCopy();
      copy.parent = move;
      copy.depth = child.depth;
      move.children.push(copy);
    });
  }

  return move;
};


/**
 * Traverse the tree depth-first and apply fn to every node
 */
Move.prototype.traverse = function (fn) {
  fn(this);
  this.children && this.children.forEach(function (child) { child.traverse(fn); });
};


/**
 * For development
 */
Move.prototype.print = function (indent) {
  indent = indent || '';
  var msg = indent + '* ' + this.n + ' - ' + this.type;
  if (this.type === Move.types.STONE) {
    msg += ' - ' + this.x + '-' + this.y;
  }
  console.log(msg);

  if (this.children) {
    this.children.forEach(function (c) { c.print(indent + '  '); });
  }
};



//var m = new Move(0, Move.types.STONE, 4, 5);
//var c;

//c = m.addChild(1, Move.types.STONE, 3, 2);
//c = c.addChild(2, Move.types.STONE, 3, 15);
//c.addChild(3, Move.types.STONE, 4, 15);
//var c2 = c.addChild(4, Move.types.STONE, 5, 15);
//c.addChild(5, Move.types.STONE, 6, 15);

//c2 = c2.addChild(6, Move.types.STONE, 3, 11);
//c2 = c2.addChild(7, Move.types.STONE, 3, 12);



var m = new Move(0, Move.types.STONE, 0, 0);
var c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17;

c1 = m.addChild(1, Move.types.STONE, 1, 1);
c2 = c1.addChild(2, Move.types.STONE, 2, 1);
c3 = c1.addChild(3, Move.types.STONE, 3, 1);
c4 = c3.addChild(4, Move.types.STONE, 4, 1);
c5 = c4.addChild(5, Move.types.STONE, 5, 1);
c6 = c4.addChild(6, Move.types.STONE, 6, 1);
c7 = c3.addChild(7, Move.types.STONE, 7, 1);
c8 = c7.addChild(8, Move.types.STONE, 8, 1);
c9 = c3.addChild(9, Move.types.STONE, 9, 1);
c10 = m.addChild(10, Move.types.STONE, 10, 1);
c11 = c10.addChild(11, Move.types.STONE, 11, 1);
c12 = c10.addChild(12, Move.types.STONE, 12, 1);
c13 = c12.addChild(13, Move.types.STONE, 13, 1);
c14 = c13.addChild(14, Move.types.STONE, 14, 1);
c15 = c12.addChild(15, Move.types.STONE, 15, 1);
c16 = c12.addChild(16, Move.types.STONE, 16, 1);
c17 = c16.addChild(17, Move.types.STONE, 17, 1);

m.print();

console.log('=================================================================');

var copy = m.createCopy();
copy.print();


/**
 * GameEngine Public API
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
