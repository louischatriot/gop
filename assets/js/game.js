var gobanContainer = "#the-goban", hudContainer = "#hud";
var canPlayColor = 'both';   // DEV $('#can-play').html();
var gameId = $('#game-id').html();
var size = parseInt($('#size').html(), 10);
var gameEngine = new GameEngine({ size: size });
var goban = new Goban({ size: size, container: gobanContainer, gameEngine: gameEngine, canPlayColor: canPlayColor });
var movesKnownByServer = [];

gameEngine.on('intersection.cleared', function (i) { goban.clearIntersection(i.x, i.y); });
gameEngine.on('board.cleared', function () { goban.clearBoard(); });
gameEngine.on('captured.change', function (m) { $(hudContainer + ' .captured-' + m.player).html(m.captured); });

gameEngine.on('movePlayed', function (m) {
  // Move played
  var msg;
  if (m.currentMove === 0) {
    msg = "No move played yet";
  } else if (m.move === GameEngine.moves.PASS) {
    msg = "Move " + m.moveNumber + ' - ' + m.player + ' passed';
  } else if (m.move === GameEngine.moves.RESIGN) {
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
  // DEV
  //if (m.moveNumber > movesKnownByServer.length) {
    //$.ajax({ type: 'POST', url: '/api/game/' + gameId, dataType: 'json', data: { move: m.move } });
  //}

  updateHUDButtonsState();
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
// DEV
//socket.on('game.movePlayed', function (m) {
  //movesKnownByServer = m.moves
  //gameEngine.refreshGameMoves(movesKnownByServer);
//});


// Activate/deactivate buttons depending on turn and game state
function updateHUDButtonsState () {
  if (gameEngine.currentPlayer === canPlayColor && !gameEngine.isGameFinished()) {
    $(hudContainer + ' .pass').prop('disabled', false);
    $(hudContainer + ' .resign').prop('disabled', false);
  } else {
    $(hudContainer + ' .pass').prop('disabled', true);
    $(hudContainer + ' .resign').prop('disabled', true);
  }
}


// Replay moves if game is not finished and is reloaded
// DEV
//movesKnownByServer = JSON.parse($('#movesKnownByServer').html());
//movesKnownByServer.forEach(function (move) {
  //gameEngine.play(move);
//});
//updateHUDButtonsState();









// Dev
var dotSize = 30;   // In pixels
var dotSpacing = 25;   // In pixels
var $movesContainer = $('#moves .inner');
$movesContainer.width(2000);
$movesContainer.height(400);

function createHudDot (color, label) {
  var $dot = $('<div class="hud-stone-' + color + '"><div style="display: table-cell; vertical-align: middle;">' + label + '</div></div>');
  $dot.width(dotSize);
  $dot.height(dotSize);
  return $dot;
}


var $dot = createHudDot('white', 142);

$dot.css('left', '50px');
$dot.css('top', '50px');


//$movesContainer.append($dot);



function xPos (move) { return 20 + move.depth * (dotSize + dotSpacing); }
function yPos (move) { return 20 + move.yPos * (dotSize + dotSpacing); }


var tree = m.createCopy();

var maxDepth = 0;
tree.traverse(function (move) { maxDepth = Math.max(maxDepth, move.depth); });

// Assign to yPos the minimum possible y position (in stone + spacing length)
// Keep in mind which nodes are on the same depth for "horizontalization" step
var nexts = [];
for (var i = 0; i <= maxDepth; i += 1) { nexts.push(0); }
tree.traverse(function (move) {
  move.yPos = nexts[move.depth];
  nexts[move.depth] += 1;
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
  var $dot = createHudDot('black', move.n);
  $dot.css('left', xPos(move) + 'px');
  $dot.css('top', yPos(move) + 'px');
  $movesContainer.append($dot);

  // Lines
  move.parent && $('#moves .inner').line(xPos(move), yPos(move) + (dotSize / 2), xPos(move.parent) + dotSize, yPos(move.parent) + (dotSize / 2));
});









