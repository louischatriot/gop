/**
 * Play and review page
 * Variables definition
 */
var gobanContainer = "#the-goban", hudContainer = "#hud";
var $gobanContainer = $(gobanContainer), $hudContainer = $(hudContainer)
var gameId = $('#game-id').html();   // That's the review id in case this is a review page
var size = parseInt($('#size').html(), 10);
var reviewMode = $('#review-mode').html() === 'true';
var gameStatus = $('#game-status').html();
var canPlayColor = $('#can-play').html();   // In game mode, tells which color you can play. In review mode, either 'both' (you are the reviewer) or 'none'
var gameEngine = new GameEngine({ size: size });
var serverMoveTree, playApiUrl, resyncApiUrl, focusApiUrl, stateChangedEvent;
var updateDisplay = true;
var countingPointsMode = false, markedAsDead = $('#marked-dead').html(), shiftDown = false, blackScore, whiteScore;
var clickSound = new Audio('/assets/sounds/click.mp3');
var currentUndoRequest;

if (markedAsDead.length === 0) {
  markedAsDead = [];
} else {
  markedAsDead = JSON.parse(markedAsDead);
}

if (reviewMode) {
  playApiUrl = '/api/review/' + gameId;
  resyncApiUrl = '/api/review/' + gameId + '/state';
  focusApiUrl = '/api/review/' + gameId + '/focus';
  stateChangedEvent = 'review.' + gameId + '.stateChanged';
} else {
  playApiUrl = '/api/game/' + gameId;
  resyncApiUrl = '/api/game/' + gameId + '/state';
  focusApiUrl = '/api/game/' + gameId + '/focus';
  stateChangedEvent = 'game.' + gameId + '.stateChanged';
  if (gameStatus === 'stale') { gameStatus = 'ongoing'; }   // Correct short desync
  if (gameStatus !== 'ongoing') { canPlayColor = 'none'; }
}

$(document).on('keydown', function (e) { if (e.keyCode === 16) { shiftDown = true; } });
$(document).on('keyup', function (e) { if (e.keyCode === 16) { shiftDown = false; } });

var goban = new Goban({ size: size, container: gobanContainer, gameEngine: gameEngine, canPlayColor: canPlayColor });

/**
 * Common behavior
 */
gameEngine.on('intersection.cleared', function (i) { goban.clearIntersection(i.x, i.y); });
gameEngine.on('board.cleared', function () { goban.clearBoard(); });
gameEngine.on('captured.change', function (m) { $hudContainer.find('.captured-' + m.player).html(m.captured); });
gameEngine.on('ko.new', function (m) { goban.drawStone('square', m.x, m.y); });
gameEngine.on('intersection.point', function (m) { goban.drawPoint(m.owner, m.x, m.y); });
$hudContainer.find('#pass').on('click', function () { gameEngine.pass(); });
$hudContainer.find('#resign').on('click', function () { gameEngine.resign(); });

gameEngine.on('movePlayed', function (m) {
  markedAsDead = [];
  goban.removeCurrentHighlight();
  if (m.move && m.move.type === Move.types.STONE) {
    goban.drawStone(m.player, m.move.x, m.move.y, true);
    playClickSound();
  }

  // Warn server if the move originates from the goban
  if (m.move && (m.move.n > serverMoveTree.getMaxN())) {
    serverMoveTree.addChildToMove(m.move.parent.n, m.move.n, m.move.type, m.move.player, m.move.x, m.move.y);
    var data =  { move: m.move.getOwnData(), previousMoveN: m.move.parent.n };
    $.ajax({ type: 'POST', url: playApiUrl
           , dataType: 'json', contentType:"application/json; charset=utf-8"
           , data: JSON.stringify(data) });
  }

  if (gameEngine.isCurrentBranchDoublePass()) {
    countingPointsMode = true;
    updatePointsCount();
  } else {
    countingPointsMode = false;
  }

  if (m.move && m.move.type === Move.types.RESIGN) {
    gameStatus = 'finished';
  }

  if (updateDisplay) {
    updateHUDstate();
    redrawGameTree();
  }
});

goban.on('intersection.clicked', function (msg) {
  if (!countingPointsMode) {
    if (canPlayColor === 'both' || canPlayColor === gameEngine.currentPlayer) {
      gameEngine.play({ type: Move.types.STONE, x: msg.x, y: msg.y });
    }
  } else {
    // Update list of dead stones
    if (gameEngine.board[msg.x][msg.y] === GameEngine.players.EMPTY) { return; }
    var g = gameEngine.getGroup(msg.x, msg.y);

    // markedAsDead contains only unique values. Linear dedup.
    var _markedAsDead = {};
    markedAsDead.forEach(function (i) { _markedAsDead[i.x + '-' + i.y] = true; });
    g.forEach(function (i) { _markedAsDead[i.x + '-' + i.y] = !shiftDown; });
    markedAsDead = [];
    Object.keys(_markedAsDead).forEach(function (k) {
      if (_markedAsDead[k]) {
        markedAsDead.push({ x: parseInt(k.split('-')[0], 10), y: parseInt(k.split('-')[1], 10) });
      }
    });

    // TODO: should not warn server if list unchanged
    var data = { deads: g, areDead: !shiftDown };
    $.ajax({ type: 'POST', url: '/api/game/' + gameId + '/mark-dead'
           , dataType: 'json', contentType:"application/json; charset=utf-8"
           , data: JSON.stringify(data)
           });

    updatePointsCount();
  }
});

socket.on('game.' + gameId + '.deads.change', function (msg) {
  markedAsDead = msg.deads;
  updatePointsCount();
});

socket.on('game.' + gameId + '.okFor.change', function (msg) {
  var message;
  if (msg.okFor === 'none') {
    message = "";
  } else {
    if (msg.okFor === canPlayColor) {
      message = "You are OK with the score";
    } else {
      message = "Your opponent is OK with the score";
    }
  }
  $hudContainer.find('.ok-for').html(message);
});

socket.on('game.' + gameId + '.bothOk', function () {
  console.log("SCORING FINISHED");
  gameStatus = 'finished';
  updateHUDstate();
});


/**
 * Update scores and markings on the board while counting points
 */
function updatePointsCount () {
  goban.removePointsMarking();
  goban.markDead(markedAsDead);

  var scores = gameEngine.getScores(markedAsDead);
  blackScore = scores.blackScore;
  whiteScore = scores.whiteScore;

  updateHUDstate();
}


/**
 * Game state was updated on the server which sent the diff to the client
 * If diff is not enough to reconstruct game state, client requests a full copy from the server
 * @param {Number} currentMoveNumber Required, move on which the game is focused
 * @param {Move} playedMove Optional, a new move that was just played
 * @param {Number} parentMoveNumber Required if playedMove is set, move from which move was played
 */
socket.on(stateChangedEvent, function (diff) {
  // TODO: Place move on the right part of the tree (desync possible)
  console.log('RECEIVED NEW DIFF');
  console.log(diff);

  // Sync played move
  if (diff.playedMove) {
    if (diff.playedMove.n <= gameEngine.movesRoot.getMaxN()) {
      console.log('Move already in client game tree');
      return;
    }

    if (diff.playedMove.n > gameEngine.movesRoot.getMaxN() + 1) {
      console.log('Client out of sync, resync');
      return resyncWithServer();
    }

    // diff.playedMove.n = gameEngine.movesRoot.getMaxN() + 1
    console.log('Client is missing one move, played by the opponent. Adding it to game tree.');
    serverMoveTree.addChildToMove(diff.parentMoveNumber, diff.playedMove.n, diff.playedMove.type, diff.playedMove.player, diff.playedMove.x, diff.playedMove.y);
    gameEngine.backToMove(diff.parentMoveNumber);
    gameEngine.play(diff.playedMove);
  }

  // Sync focus
  if (diff.currentMoveNumber > gameEngine.movesRoot.getMaxN()) {
    console.log('Focus shifted to unknown move, resync');
    return resyncWithServer();
  } else {
    console.log('Switching to move ' + diff.currentMoveNumber);
    focusOnMove(diff.currentMoveNumber, false);
  }
});


/**
 * Resyncing with server, retrieving whole game tree and current move number
 */
function resyncWithServer () {
  $.ajax({ type: 'GET', url: resyncApiUrl }).complete(function (jqXHR) {
    console.log('Receiving full state from server');
    console.log(jqXHR);
    serverMoveTree = Move.deserialize(jqXHR.responseJSON.moves);
    gameEngine.replaceGameTree(serverMoveTree.createCopy());
    var currentMoveNumber = jqXHR.responseJSON.currentMoveNumber;
    if (currentMoveNumber.length === 0) { currentMoveNumber = 0; }
    focusOnMove(currentMoveNumber, false);
  });
}


/**
 * Focus on another move. Disable automatic refreshing of tree while moves are replayed for speed.
 * @param {Boolean} warnServer Optional, if true server is warned of the focus change to update all other clients
 */
function focusOnMove (n, warnServer) {
  updateDisplay = false;
  gameEngine.backToMove(n);
  updateHUDstate();
  redrawGameTree();
  updateDisplay = true;

  if (warnServer && reviewMode) {   // Clients only allowed to change focus if in review mode
    var data =  { currentMoveNumber: n };
    $.ajax({ type: 'POST', url: focusApiUrl
           , dataType: 'json', contentType:"application/json; charset=utf-8"
           , data: JSON.stringify(data) });
  }
}


/**
 * Such an evocative name
 */
function updateHUDstate () {
  // Move just played
  var msg;
  if (gameEngine.currentMove.depth === 0) {
    msg = "No move played yet";
  } else if (gameEngine.currentMove.type === Move.types.PASS) {
    msg = "Move " + gameEngine.currentMove.depth + ' - ' + gameEngine.currentMove.player + ' passed';
  } else if (gameEngine.currentMove.type === Move.types.RESIGN) {
    msg = "Move " + gameEngine.currentMove.depth + ' - ' + gameEngine.currentMove.player + ' resigned';
  } else {
    msg = 'Move ' + gameEngine.currentMove.depth + ' - ' + gameEngine.currentMove.player + ' ' + gameEngine.currentMove.x + '-' + gameEngine.currentMove.y;
  }
  $hudContainer.find('.move-number').html(msg);

  // Turn
  if (!gameEngine.canPlayInCurrentBranch()) {
    $hudContainer.find('.turn').html('Game finished' + (countingPointsMode ? ' - scoring' : ''));
  } else {
    $hudContainer.find('.turn').html('Turn: ' + gameEngine.getOppositePlayer(gameEngine.currentMove.player));
  }

  // Pass and resign buttons
  if ((canPlayColor === 'both' || gameEngine.currentPlayer === canPlayColor) && gameEngine.canPlayInCurrentBranch()) {
    $hudContainer.find('#pass').prop('disabled', false);
    $hudContainer.find('#resign').prop('disabled', false);
  } else {
    $hudContainer.find('#pass').prop('disabled', true);
    $hudContainer.find('#resign').prop('disabled', true);
  }

  // Undo
  if (gameEngine.currentMove.type === Move.types.RESIGN || gameStatus !== 'ongoing') {
    $hudContainer.find('#undo').prop('disabled', true);
  } else {
    $hudContainer.find('#undo').prop('disabled', false);
  }
  if (currentUndoRequest) {
    if (currentUndoRequest.moveNumber + 1 < gameEngine.currentMove.n) {
      currentUndoRequest = undefined;
      $hudContainer.find('#undo-request').html('');
    }
  } else {
    $hudContainer.find('#undo-request').html('');
  }

  // Points counting
  if (countingPointsMode) {
    $hudContainer.find('#points').css('display', 'block');
    $hudContainer.find('.scoring-done').remove();
    msg = "Click on a stone to mark it dead, shift-click to mark it alive<br>";
    msg += "<b>Scores:</b><ul>";
    msg += "<li>Black: " + blackScore + "</li>";
    msg += "<li>White: " + whiteScore + "</li>";
    msg += "</ul>";
    if (gameStatus === 'ongoing') { msg += "<button class='scoring-done btn'>Scoring done</button><span class='ok-for' style='margin-left: 10px;'></span>"; }
    $hudContainer.find("#points").html(msg);
    $hudContainer.find('.scoring-done').on('click', function () {
      $.ajax({ type: 'POST', url: '/api/game/' + gameId + '/agree-on-deads'
             , dataType: 'json', contentType:"application/json; charset=utf-8"
             , data: JSON.stringify({})
             });
    });
  } else {
    $hudContainer.find('#points').css('display', 'none');
  }

  // Display a 'review game' button when game is finished
  if (!reviewMode) {
    if (gameStatus === 'ongoing') {
      $hudContainer.find('#create-review').css('display', 'none');
      $hudContainer.find('#reviews').css('display', 'none');
    } else {
      $hudContainer.find('#create-review').css('display', 'block');
      $hudContainer.find('#reviews').css('display', 'block');
    }
  }
}


/**
 * Such an evocative name. Might want to put it in the review section only
 */
function redrawGameTree() {
  console.log('Redrawing game tree');

  // Dev
  var dotSize = 30;   // In pixels
  var dotSpacing = 15;   // In pixels
  var $movesContainer = $('#moves .inner');
  $movesContainer.html('');

  function xPos (move) { return dotSpacing + move.depth * (dotSize + dotSpacing); }
  function yPos (move) { return dotSpacing + move.yPos * (dotSize + dotSpacing); }

  var tree = gameEngine.movesRoot.createCopy();

  var maxDepth = 0;
  tree.traverse(function (move) { maxDepth = Math.max(maxDepth, move.depth); });

  // Assign to yPos the minimum possible y position (in stone + spacing length)
  // Keep in mind which nodes are on the same depth for "horizontalization" step
  var nexts = [];
  var maxYPos = 0;
  for (var i = 0; i <= maxDepth; i += 1) { nexts.push(0); }
  tree.traverse(function (move) {
    move.yPos = nexts[move.depth];
    nexts[move.depth] += 1;
    maxYPos = Math.max(maxYPos, move.yPos);
  });

  // "Horizontalize" graph - step 1
  var depths = [];
  tree.traverse(function (move) {
    if (!depths[move.depth]) { depths[move.depth] = []; }
    depths[move.depth].push(move);
  });
  tree.traverse(function (move) {
    if (!move.parent) { return; }

    var delta = move.parent.yPos - move.yPos;
    if (delta > 0) {
      var begun = false;
      depths[move.depth].forEach(function (m) {
        if (m === move) { begun = true; }
        if (begun) {
          m.yPos += delta;
        }
      });
    }
  });

  // "Horizontalize" graph - step 2
  depths = [];
  tree.traverse(function (move) {
    if (!depths[move.depth]) { depths[move.depth] = []; }
    depths[move.depth].push(move);
  });
  tree.postOrderTraverse(function (move) {
    if (!move.children) { return; }

    var delta = move.children[0].yPos - move.yPos;
    if (delta > 0) {
      var begun = false;
      depths[move.depth].forEach(function (m) {
        if (m === move) { begun = true; }
        if (begun) {
          m.yPos += delta;
        }
      });
    }
  });

  // Display stones and lines
  tree.traverse(function (move) {
    // Stones
    var dotLabel = '';
    switch (move.type) {
      case Move.types.PASS:
        dotLabel = 'P';
        break;
      case Move.types.RESIGN:
        dotLabel = 'R';
        break;
      case Move.types.STONE:
        dotLabel = move.depth;
        break;
    }
    var $dot = $('<div data-n="' + move.n + '" class="hud-stone-' + move.player + '"><div style="display: table-cell; vertical-align: middle;">' + dotLabel + '</div></div>');
    $dot.width(dotSize);
    $dot.height(dotSize);
    $dot.css('left', xPos(move) + 'px');
    $dot.css('top', yPos(move) + 'px');
    if (canPlayColor === 'both') { $dot.css('cursor', 'pointer'); }
    $dot.on('click', function (evt) {
      if (canPlayColor !== 'both') { return; }
      var n = $(evt.target).parent().data('n') || $(evt.target).data('n');   // So evil
      focusOnMove(parseInt(n, 10), true);
    });
    $movesContainer.append($dot);

    // Lines
    move.parent && $('#moves .inner').line(xPos(move), yPos(move) + (dotSize / 2), xPos(move.parent) + dotSize, yPos(move.parent) + (dotSize / 2));
  });

  // Highlight current move
  $movesContainer.find('div[data-n=' + gameEngine.currentMove.n + ']').css('border', 'solid red 3px');

  // Set inner box dimensions to fit the graph and focus graph on current move
  $movesContainer.width(dotSpacing + (maxDepth + 1) * (dotSize + dotSpacing));
  $movesContainer.parent().scrollLeft(xPos(gameEngine.currentMove) - ($movesContainer.parent().width() / 2));
  $movesContainer.height(300);
}

function debounce (wait, fn) {
  var canRun = true;
  return function () {
    if (canRun) {
      canRun = false;
      setTimeout(function () { canRun = true; }, wait);
      fn();
    }
  };
}

var playClickSound = debounce(150, function () { clickSound.play(); });

/**
 * END OF COMMON BEHAVIOR
 */


/**
 * Game-specific section
 */
if (!reviewMode) {
  /**
   * Reviews list
   */
  var reviewsTemplate = '';

  reviewsTemplate += '{{^activeReviews.length}}<b>No active review</b><br>{{/activeReviews.length}}';
  reviewsTemplate += '{{#activeReviews.length}}<b>Active reviews</b><ul>';
  reviewsTemplate += '{{#activeReviews}}<li><a href="/web/review/{{_id}}">By {{reviewerName}}</a></li>{{/activeReviews}}';
  reviewsTemplate += '</ul>{{/activeReviews.length}}';

  reviewsTemplate += '{{^inactiveReviews.length}}<b>No past review</b>{{/inactiveReviews.length}}';
  reviewsTemplate += '{{#inactiveReviews.length}}<b>Past reviews</b><ul>';
  reviewsTemplate += '{{#inactiveReviews}}<li><a href="/web/review/{{_id}}">By {{reviewerName}}</a></li>{{/inactiveReviews}}';
  reviewsTemplate += '</ul>{{/inactiveReviews.length}}';

  $hudContainer.find('#create-review').on('click', function () {
    document.location = '/web/review/new?gameId=' + gameId;
  });

  socket.on('game.' + gameId + '.reviewsChange', function (msg) {
    $hudContainer.find('#reviews').css('display', 'block');
    $hudContainer.find('#reviews').html(Mustache.render(reviewsTemplate, msg));
  });
  $hudContainer.find('#reviews').html(Mustache.render(reviewsTemplate, JSON.parse($('#initial-reviews').html())));


  /**
   * Undo
   */
  function requestUndo () { $.ajax({ type: 'GET', url: '/api/game/' + gameId + '/undo' }); }
  $hudContainer.find('#undo').css('display', 'block');
  $hudContainer.find('#undo').on('click', requestUndo);

  socket.on('game.' + gameId + '.undo', function (msg) {
    gameEngine.undo(msg.undone);
    var currentN = gameEngine.currentMove.n;
    gameEngine.currentMove = gameEngine.movesRoot;
    focusOnMove(currentN);
    serverMoveTree = gameEngine.movesRoot.createCopy();
    currentUndoRequest = undefined;
    countingPointsMode = false;
    markedAsDead = [];
    updateHUDstate();
  });

  socket.on('game.' + gameId + '.undoRequest', function (msg) {
    var message = '';
    if (msg.requester === canPlayColor) {
      message += 'You requested an undo'
    } else {
      message += 'An undo was requested. <a href="#" class="accept-undo">Accept it</a>';
    }
    $hudContainer.find('#undo-request').css('display', 'block');
    $hudContainer.find('#undo-request').html(message);
    $hudContainer.find('.accept-undo').on('click', function (e) { e.preventDefault(); requestUndo(); });
    currentUndoRequest = msg;
  });
}
/**
 * END OF GAME-SPECIFIC SECTION
 */


/**
 * Review-specific section
 */
if (reviewMode) {
  $hudContainer.find('.back').css('display', 'inline');
  $hudContainer.find('.next').css('display', 'inline');
  $hudContainer.find('#moves').css('display', 'block');

  $hudContainer.find('.back').on('click', function () { gameEngine.back(); });
  $hudContainer.find('.next').on('click', function () { gameEngine.next(); });

  $(document).on('keydown', function (evt) {
    if (evt.keyCode === 37) { gameEngine.back(); }
    if (evt.keyCode === 39) { gameEngine.next(); }
  });
}
/**
 * END OF REVIEW SPECIFIC SECTION
 */


/**
 * INITIALIZATION
 */
serverMoveTree = Move.deserialize($('#server-move-tree').html());
gameEngine.replaceGameTree(serverMoveTree.createCopy());
var currentMoveNumber = $('#current-move-number').html();
if (currentMoveNumber.length === 0) { currentMoveNumber = 0; }
focusOnMove(currentMoveNumber, false);


