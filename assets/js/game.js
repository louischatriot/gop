/**
 * Play and review page
 */
var gobanContainer = "#the-goban", hudContainer = "#hud";
var $gobanContainer = $(gobanContainer), $hudContainer = $(hudContainer)
var canPlayColor = $('#can-play').html();   // In game mode, tells which color you can play. In review mode, either 'both' (you are the reviewer) or 'none'
var gameId = $('#game-id').html();   // That's the review id in case this is a review page
var size = parseInt($('#size').html(), 10);
var reviewMode = $('#reviewMode').html() === 'true';
var gameEngine = new GameEngine({ size: size });
var goban = new Goban({ size: size, container: gobanContainer, gameEngine: gameEngine, canPlayColor: canPlayColor });
var serverMoveTree, playApiUrl, resyncApiUrl, focusApiUrl, socketEvent;
var updateDisplay = true;

if (reviewMode) {
  playApiUrl = '/api/review/' + gameId;
  resyncApiUrl = '/api/review/' + gameId + '/state';
  focusApiUrl = '/api/review/' + gameId + '/focus';
  socketEvent = 'review.' + gameId + '.stateChanged';
} else {
  playApiUrl = '/api/game/' + gameId;
  resyncApiUrl = '/api/game/' + gameId + '/state';
  focusApiUrl = '/api/game/' + gameId + '/focus';
  socketEvent = 'game.' + gameId + '.stateChanged';
}



/**
 * Common behavior
 */
gameEngine.on('intersection.cleared', function (i) { goban.clearIntersection(i.x, i.y); });
gameEngine.on('board.cleared', function () { goban.clearBoard(); });
gameEngine.on('captured.change', function (m) { $hudContainer.find('.captured-' + m.player).html(m.captured); });
gameEngine.on('ko.new', function (m) { goban.drawStone('square', m.x, m.y); });
$hudContainer.find('.pass').on('click', function () { gameEngine.pass(); });
$hudContainer.find('.resign').on('click', function () { gameEngine.resign(); });

gameEngine.on('movePlayed', function (m) {
  // Move played
  var msg;
  if (m.moveNumber === 0) {
    msg = "No move played yet";
  } else if (m.move.type === Move.types.PASS) {
    msg = "Move " + m.moveNumber + ' - ' + m.player + ' passed';
  } else if (m.move.type === Move.types.RESIGN) {
    msg = "Move " + m.moveNumber + ' - ' + m.player + ' resigned';
  } else {
    msg = 'Move ' + m.moveNumber + ' - ' + m.player + ' ' + m.move.x + '-' + m.move.y;
    goban.drawStone(m.player, m.move.x, m.move.y);
  }
  $hudContainer.find('.move-number').html(msg);

  // Turn
  if (gameEngine.isGameFinished()) {
    $hudContainer.find('.turn').html('Game finished');
  } else {
    $hudContainer.find('.turn').html('Turn: ' + gameEngine.getOppositePlayer(m.player));
  }

  // Warn server if the move originates from the goban
  if (m.move && (m.move.n > serverMoveTree.getMaxN())) {
    serverMoveTree.addChildToMove(m.move.parent.n, m.move.n, m.move.type, m.move.player, m.move.x, m.move.y);
    var data =  { move: m.move.getOwnData(), previousMoveN: m.move.parent.n };
    $.ajax({ type: 'POST', url: playApiUrl
           , dataType: 'json', contentType:"application/json; charset=utf-8"
           , data: JSON.stringify(data) });
  }

  if (updateDisplay) {
    updateHUDButtonsState();
    redrawGameTree();
  }
});


/**
 * Game state was updated on the server which sent the diff to the client
 * If diff is not enough to reconstruct game state, client requests a full copy from the server
 * @param {Number} currentMoveNumber Required, move on which the game is focused
 * @param {Move} playedMove Optional, a new move that was just played
 * @param {Number} parentMoveNumber Required if playedMove is set, move from which move was played
 */
socket.on(socketEvent, function (diff) {
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
  updateHUDButtonsState();
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
function updateHUDButtonsState () {
  // Pass and resign buttons
  if ((canPlayColor === 'both' || gameEngine.currentPlayer === canPlayColor) && !gameEngine.isGameFinished()) {
    $hudContainer.find('.pass').prop('disabled', false);
    $hudContainer.find('.resign').prop('disabled', false);
  } else {
    $hudContainer.find('.pass').prop('disabled', true);
    $hudContainer.find('.resign').prop('disabled', true);
  }

  // Display a 'review game' button when game is finished
  if (!reviewMode) {
    if (gameEngine.isGameFinished()) {
      $hudContainer.find('.create-review').css('display', 'block');
    } else {
      $hudContainer.find('.create-review').css('display', 'none');
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
    $dot.css('cursor', 'pointer');   // TODO: Should handle cursor if you're not a reviewer
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

/**
 * END OF COMMON BEHAVIOR
 */


/**
 * Game-specific section
 */
if (!reviewMode) {
  $hudContainer.find('.create-review').on('click', function () {
    document.location = '/web/review/new?gameId=' + gameId;
  });
  // Add list of current reviews and automatic review loading for one player when opponent creates review
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
serverMoveTree = Move.deserialize($('#serverMoveTree').html());
gameEngine.replaceGameTree(serverMoveTree.createCopy());
var currentMoveNumber = $('#currentMoveNumber').html();
if (currentMoveNumber.length === 0) { currentMoveNumber = 0; }
focusOnMove(currentMoveNumber, false);


