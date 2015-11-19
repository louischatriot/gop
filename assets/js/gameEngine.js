/**
 * Create new move
 * n is the move number, a unique incremental id that is used to identify a specific move and enable incremental synchronization
 * If type is not specified it is implied to be STONE
 * x and y are needed online for type STONE
 */
function Move (n, type, player, x, y) {
  this.n = n;
  this.type = type || Move.types.STONE;
  if (typeof x === 'number') { this.x = x; }
  if (typeof y === 'number') { this.y = y; }
  this.player = player || 'empty';
  this.depth = 0;
}

Move.types = { STONE: 'stone', PASS: 'pass', RESIGN: 'resign', EMPTY: 'empty' };


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

Move.prototype.removeChild = function (move) {
  if (move.parent !== this) { return; }

  move.parent = null;
  var _children = [];
  this.children.forEach(function (child) { if (child !== move) { _children.push(child); } });
  this.children = _children.length > 0 ? _children : undefined;
};


/**
 * Get node data whithout children
 */
Move.prototype.getOwnData = function () {
  return { n: this.n, type: this.type, player: this.player, x: this.x, y: this.y };
};

/**
 * @param{Boolean} strict Optional, defaults to false. If true test whether this is the same node
 *                        If false only whether this is the same move regardless of place in the tree
 */
Move.prototype.isEqualTo = function (move, strict) {
  if (strict && this.n !== move.n) { return false; }
  if (this.type !== move.type) { return false; }
  if (this.player !== move.player) { return false; }
  if (this.type === Move.types.STONE) {
    return this.x === move.x && this.y === move.y;
  } else {
    return true;
  }
};


/*
 * Returns move's child determined by the parameters, null if none found
 */
Move.prototype.child = function (type, player, x, y) {
  var m = new Move(0, type, player, x, y);
  var child = null;
  this.children && this.children.forEach(function (c) { if (c.isEqualTo(m, false)) { child = c; } });
  return child;
};


/**
 * Add a child to the move, returning the child
 * IMPORTANT: this can only be used when constructing the tree from the "bottom up", move by move
 *            depth is not propagated, and subtree link not done
 */
Move.prototype.addChild = function (n, type, player, x, y) {
  if (n.constructor && n.constructor.name === 'Move') { return this.addChild(n.n, n.type, n.player, n.x, n.y); }

  if (!this.children) { this.children = []; }

  var child;
  this.children.forEach(function (c) { if (c.isEqualTo(new Move(0, type, player, x, y), false)) { child = c; } });

  if (!child) {
    child = new Move(n, type, player, x, y);
    child.parent = this;
    this.children.push(child);
    child.depth = this.depth + 1;
  }

  return child;
};


/**
 * Add child to a specific node in the tree
 * Do nothing if parent cannot be found
 */
Move.prototype.addChildToMove = function (parentN, n, type, player, x, y) {
  var parent;
  this.traverse(function (move) { if (parentN === move.n) { parent = move; } });
  if (parent) { parent.addChild(n, type, player, x, y); }
};


Move.prototype.createCopy = function () {
  var move = new Move(this.n, this.type, this.player, this.x, this.y);

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
 * Pre-order traverse the tree depth-first and apply fn to every node
 */
Move.prototype.traverse = function (fn) {
  fn(this);
  this.children && this.children.forEach(function (child) { child.traverse(fn); });
};


/**
 * Post-order traverse the tree depth-first and apply fn to every node
 */
Move.prototype.postOrderTraverse = function (fn) {
  this.children && this.children.forEach(function (child) { child.postOrderTraverse(fn); });
  fn(this);
};


/*
 * Data copy, serialization and deserialization
 * May want a more terse representation
 */
Move.prototype.dataCopy = function () {
  var copy = { type: this.type, n: this.n, player: this.player };
  if (this.x !== undefined) { copy.x = this.x; }
  if (this.y !== undefined) { copy.y = this.y; }
  if (this.children) {
    copy.children = [];
    this.children.forEach(function (child) {
      copy.children.push(child.dataCopy());
    });
  };
  return copy;
};

Move.prototype.serialize = function () { return JSON.stringify(this.dataCopy()); };

Move.fromDataCopy = function (dataCopy) {
  var move = new Move(dataCopy.n, dataCopy.type, dataCopy.player);
  if (dataCopy.x !== undefined) { move.x = dataCopy.x; }
  if (dataCopy.y !== undefined) { move.y = dataCopy.y; }
  if (dataCopy.children) {
    move.children = [];
    dataCopy.children.forEach(function (childDataCopy) {
      var child = Move.fromDataCopy(childDataCopy);
      child.parent = move;
      move.children.push(child);
    });
  }

  return move;
};

Move.deserialize = function (jsonRepresentation) {
  if (!jsonRepresentation || jsonRepresentation.length === 0) {
    return new Move(0, Move.types.EMPTY);
  } else {
    var tree = Move.fromDataCopy(JSON.parse(jsonRepresentation));
    tree.traverse(function (move) { if (move.parent) { move.depth = move.parent.depth + 1; } });
    return tree;
  }
};


/**
 * Get maximum move number in this move tree
 */
Move.prototype.getMaxN = function () {
  var maxN = 0;
  this.traverse(function (move) { maxN = Math.max(maxN, move.n); });
  return maxN;
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


/**
 * GameEngine Public API
 * * gameEngine.play(move) - have current player play move, which can be placing a stone {x, y}, passing or resigning
 * * gameEngine.playStone(x, y) - have current player play a stone at x, y
 * * gameEngine.pass() - have current player pass
 * * gameEngine.resign() - have the current player resign
 * * gameEngine.isMoveValid(x, y) - can the current player play a stone at x, y
 * * gameEngine.canPlayInCurrentBranch()
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

  if (hard) {
    this.movesRoot = new Move(0, Move.types.EMPTY);
    this.allMoves = {};
    this.allMoves[0] = this.movesRoot;
    this.maxMoveNumber = 0;
  }
  this.currentMove = this.movesRoot;   // Move 0 is empty board

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

  if (!this.canPlayInCurrentBranch()) { return; }
  if (!this.isMoveValid(x, y)) { return; }

  this.removeCurrentKo();

  var capturedStones = this.stonesCapturedByMove(x, y);
  capturedStones.forEach(function (stone) {
    self.board[stone.x][stone.y] = GameEngine.players.EMPTY;
    self.emit('intersection.cleared', { x: stone.x, y: stone.y });
  });
  this.captured[this.currentPlayer] += capturedStones.length;
  this.emit('captured.change', { player: this.currentPlayer, captured: this.captured[this.currentPlayer] });

  // Actually play the move
  this.board[x][y] = this.currentPlayer;
  this.updateGameTree(Move.types.STONE, x, y);

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
 * Update game tree and warn listeners that move was played
 * Child is created only if it doesn't exist
 * x and y are optional
 */
GameEngine.prototype.updateGameTree = function (type, x, y) {
  var existingChild = this.currentMove.child(type, this.currentPlayer, x, y);
  if (existingChild) {
    this.currentMove = existingChild;
  } else {
    this.maxMoveNumber += 1;
    this.currentMove = this.currentMove.addChild(this.maxMoveNumber, type, this.currentPlayer, x, y);
    this.allMoves[this.maxMoveNumber] = this.currentMove;
  }
  this.currentPlayer = this.getOppositePlayer();
  this.emit('movePlayed', { moveNumber: this.currentMove.depth, player: this.getOppositePlayer(), move: this.currentMove });
};


/*
 * Pass
 */
GameEngine.prototype.pass = function () {
  if (!this.canPlayInCurrentBranch()) { return; }
  this.removeCurrentKo();
  this.updateGameTree(Move.types.PASS);
};


/*
 * Resign
 */
GameEngine.prototype.resign = function () {
  if (!this.canPlayInCurrentBranch()) { return; }
  this.removeCurrentKo();
  this.updateGameTree(Move.types.RESIGN);
};


/**
 * Play a move, can be {x,y}, PASS or RESIGN
 * Return the move that was just played
 */
GameEngine.prototype.play = function (move) {
  switch (move.type) {
    case Move.types.PASS:
      this.pass();
      break;
    case Move.types.RESIGN:
      this.resign();
      break;
    case Move.types.STONE:
      this.playStone(move.x, move.y);
      break;
  }
  return this.currentMove;
};


/*
 * Tells whether game is finished at the current move (double pass or resign)
 */
GameEngine.prototype.canPlayInCurrentBranch = function () {
  return !(this.currentMove.type === Move.types.RESIGN || this.isCurrentBranchDoublePass());
};

GameEngine.prototype.isCurrentBranchDoublePass = function () {
  if (!this.currentMove.parent) { return false; }
  return this.currentMove.type === Move.types.PASS && this.currentMove.parent.type === Move.types.PASS;
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
  var self = this;

  if (!this.allMoves[n]) { return; }
  if (this.currentMove.n > 0 && this.currentMove.n === n) { return; }

  this.emit('board.cleared');
  this.initialize();
  this.emit('movePlayed', { moveNumber: 0, player: this.getOppositePlayer() });   // A bit dirty but it can be seen that way :)

  var movesToReplay = [];
  var m = this.allMoves[n];
  while (m.parent) {
    movesToReplay.unshift(m);
    m = m.parent;
  }

  movesToReplay.forEach(function (move) { self.play(move); });
};

GameEngine.prototype.back = function () {
  this.currentMove.parent && this.backToMove(this.currentMove.parent.n);
};

GameEngine.prototype.next = function () {
  this.backToMove(this.currentMove + 1);
};


/**
 * Undo all moves for the branch starting at given move, move included
 * Warning: this can only be called during a game, not a review, as it needs to remove only the last moves (in terms of n).
 *          If not there will be a gap in n, resulting in synchronization issues
 */
GameEngine.prototype.undo = function (toUndoNumber) {
  var toUndo = this.allMoves[toUndoNumber];
  if (!toUndo.parent) { return; }
  var targetMoveNumber = toUndo.parent.n;
  toUndo.parent.removeChild(toUndo);
  while (this.maxMoveNumber > targetMoveNumber) {
    delete this.allMoves[this.maxMoveNumber];
    this.maxMoveNumber -= 1;
  }
  this.currentMove = this.allMoves[targetMoveNumber];
};


/**
 * Replace entire game move tree from given move tree
 * Currently used to synchronize with server
 * Will place focus on first move (empty board)
 * WARNING: movesTree is not deep copied, needs to be done manually if side effects are to be avoided
 *
 * TODO: right now backToMove needs to be called after a call to this function
 *       bundle functions or find a cleaner way
 */
GameEngine.prototype.replaceGameTree = function (movesTree) {
  var self = this;
  this.movesRoot = movesTree;
  this.allMoves = {};
  this.maxMoveNumber = 0;
  this.movesRoot.traverse(function (move) {
    self.allMoves[move.n] = move;
    self.maxMoveNumber = Math.max(self.maxMoveNumber, move.n);
  });
};



// Code shared on the server.
GameEngine.Move = Move;
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') { module.exports = GameEngine; }
