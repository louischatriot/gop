var gobanContainer = "#the-goban", hudContainer = "#hud";
var canPlayColor = $('#can-play').html();
var gameId = $('#game-id').html();
var size = parseInt($('#size').html(), 10);
var gameEngine = new GameEngine({ size: size });
var goban = new Goban({ size: size, container: gobanContainer, gameEngine: gameEngine, canPlayColor: canPlayColor });
var movesKnownByServer = [];

gameEngine.on('intersection.cleared', function (i) {
  goban.clearIntersection(i.x, i.y);
});

gameEngine.on('board.cleared', function () {
  goban.clearBoard();
});

gameEngine.on('captured.change', function (m) {
  $(hudContainer + ' .captured-' + m.player).html(m.captured);
});

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
  if (m.moveNumber > movesKnownByServer.length) {
    $.ajax({ type: 'POST', url: '/api/game/' + gameId, dataType: 'json', data: { move: m.move } });
  }

  console.log(m);
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
socket.on('game.movePlayed', function (m) {
  movesKnownByServer = m.moves
  gameEngine.refreshGameMoves(movesKnownByServer);
});


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
movesKnownByServer = JSON.parse($('#moves').html());
movesKnownByServer.forEach(function (move) {
  gameEngine.play(move);
});
updateHUDButtonsState();
