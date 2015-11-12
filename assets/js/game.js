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
  console.log("==========================");
  console.log(m.move);
  console.log(m.move.parent);
  console.log(serverMoveTree.getMaxN());
  console.log(gameId);
  if (m.move && (m.move.n > serverMoveTree.getMaxN())) {
    $.ajax({ type: 'POST', url: '/api/game/' + gameId, dataType: 'json', data: { move: m.move } });
    //$.ajax({ type: 'POST', url: '/api/game/' + gameId, dataType: 'json', data: { move: m.move, previousMoveN: m.move.parent.n } });
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


// Server warns us of a played move by sending back the whole game moves state (inefficient of course, to be improved if this is a bottleneck)
//socket.on('game.movePlayed', function (m) {
  //serverMoveTree = Move.deserialize(m.moves);
  //gameEngine.replaceGameTree(movesKnownByServer);
//});


// Activate/deactivate buttons depending on turn and game state
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
      gameEngine.backToMove(parseInt(n, 10));
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
updateHUDButtonsState();
redrawGameTree();

