var gobanContainer = "#the-goban", hudContainer = "#hud";
var canPlayColor = 'both';   // DEV $('#can-play').html();
var gameId = $('#game-id').html();
var size = parseInt($('#size').html(), 10);
var gameEngine = new GameEngine({ size: size });
var goban = new Goban({ size: size, container: gobanContainer, gameEngine: gameEngine, canPlayColor: canPlayColor });
var serverMoveTree;

gameEngine.on('intersection.cleared', function (i) { goban.clearIntersection(i.x, i.y); });
gameEngine.on('board.cleared', function () { goban.clearBoard(); });
gameEngine.on('captured.change', function (m) { $(hudContainer + ' .captured-' + m.player).html(m.captured); });

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
  $(hudContainer + ' .move-number').html(msg);

  // Turn
  if (gameEngine.isGameFinished()) {
    $(hudContainer + ' .turn').html('Game finished');
  } else {
    $(hudContainer + ' .turn').html('Turn: ' + gameEngine.getOppositePlayer(m.player));
  }

  // Warn server if the move originates from the goban
  if (m.move && (m.move.n > serverMoveTree.getMaxN())) {
    serverMoveTree.addChildToMove(m.move.parent.n, m.move.n, m.move.type, m.move.player, m.move.x, m.move.y);
    var data =  { move: m.move.getOwnData(), previousMoveN: m.move.parent.n };
    $.ajax({ type: 'POST', url: '/api/game/' + gameId
           , dataType: 'json', contentType:"application/json; charset=utf-8"
           , data: JSON.stringify(data) });
  }

  updateHUDButtonsState();
  redrawGameTree();
});

gameEngine.on('ko.new', function (m) {
  goban.drawStone('square', m.x, m.y);
});

//$(hudContainer + ' .back').on('click', function () { gameEngine.back(); });
//$(hudContainer + ' .next').on('click', function () { gameEngine.next(); });
$(hudContainer + ' .pass').on('click', function () { gameEngine.pass(); });
$(hudContainer + ' .resign').on('click', function () { gameEngine.resign(); });

//$(document).on('keydown', function (evt) {
  //if (evt.keyCode === 37) { gameEngine.back(); }
  //if (evt.keyCode === 39) { gameEngine.next(); }
//});


/**
 * Game state was updated on the server which sent the diff to the client
 * If diff is not enough to reconstruct game state, client requests a full copy from the server
 * @param {Number} currentMoveNumber Required, move on which the game is focused
 * @param {Move} playedMove Optional, a new move that was just played
 * @param {Number} parentMoveNumber Required if playedMove is set, move from which move was played
 */
socket.on('game.' + gameId + '.stateChanged', function (diff) {
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
    gameEngine.backToMove(diff.currentMoveNumber);
  }
});


/**
 * Resyncing with server, retrieving whole game tree and current move number
 */
function resyncWithServer () {
  $.ajax({ type: 'GET', url: '/api/game/' + gameId + '/game-state' }).complete(function (jqXHR) {
    console.log('Receiving full state from server');
    console.log(jqXHR);
    serverMoveTree = Move.deserialize(jqXHR.responseJSON.moves);
    gameEngine.replaceGameTree(serverMoveTree.createCopy());
    var currentMoveNumber = jqXHR.responseJSON.currentMoveNumber;
    if (currentMoveNumber.length === 0) { currentMoveNumber = 0; }
    gameEngine.backToMove(currentMoveNumber);
    updateHUDButtonsState();
    redrawGameTree();
  });
}


/**
 * Focus on another move, and warn server which then tells all watchers
 */
function focusOnMove (n) {
  gameEngine.backToMove(n);
  var data =  { currentMoveNumber: n };
  $.ajax({ type: 'POST', url: '/api/game/' + gameId + '/focus'
         , dataType: 'json', contentType:"application/json; charset=utf-8"
         , data: JSON.stringify(data) });
}


/**
 * Such an evocative name
 */
function updateHUDButtonsState () {
  if ((canPlayColor === 'both' || gameEngine.currentPlayer === canPlayColor) && !gameEngine.isGameFinished()) {
    $(hudContainer + ' .pass').prop('disabled', false);
    $(hudContainer + ' .resign').prop('disabled', false);
  } else {
    $(hudContainer + ' .pass').prop('disabled', true);
    $(hudContainer + ' .resign').prop('disabled', true);
  }
}


/**
 * Such an evocative name
 */
function redrawGameTree() {
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

  // "Horizontalize" graph
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
    $dot.css('cursor', 'pointer');
    $dot.on('click', function (evt) {
      var n = $(evt.target).parent().data('n') || $(evt.target).data('n');   // So evil
      focusOnMove(parseInt(n, 10));
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


// If the game was already under way on the server, replay it
serverMoveTree = Move.deserialize($('#serverMoveTree').html());
gameEngine.replaceGameTree(serverMoveTree.createCopy());
var currentMoveNumber = $('#currentMoveNumber').html();
if (currentMoveNumber.length === 0) { currentMoveNumber = 0; }
gameEngine.backToMove(currentMoveNumber);

