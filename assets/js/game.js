var gobanContainer = "#the-goban", hudContainer = "#hud";
var canPlayColor = $('#can-play').html();
var gameId = $('#game-id').html();
var size = parseInt($('#size').html(), 10);
var game = new Game({ size: size });
var goban = new Goban({ size: size, container: gobanContainer, game: game, canPlayColor: canPlayColor });
var movesReceivedFromServer = {};

game.on('intersection.cleared', function (i) {
  goban.clearIntersection(i.x, i.y);
});

game.on('board.cleared', function () {
  goban.clearBoard();
});

game.on('captured.change', function (m) {
  $(hudContainer + ' .captured-' + m.player).html(m.captured);
});

game.on('movePlayed', function (m) {
  // Move played
  var msg;
  if (m.finished) {
    msg = 'Move ' + m.moveNumber + ' - game finished';
  } else if (m.pass) {
    msg = 'Move ' + m.moveNumber + ' - ' + m.player + ' passed';
  } else if (m.currentMove === 0) {
    msg = "No move played yet";
  } else {
    msg = 'Move ' + m.moveNumber + ' - ' + m.player + ' ' + m.x + '-' + m.y;
    goban.drawStone(m.player, m.x, m.y);
  }
  $(hudContainer + ' .move-number').html(msg);

  // Turn
  if (!m.finished) {
    $(hudContainer + ' .turn').html('Turn: ' + game.getOppositePlayer(m.player));
  } else {
    $(hudContainer + ' .turn').html('Game finished');
  }

  // Warn server if the move originates from the goban
  if (!movesReceivedFromServer[m.x + '-' + m.y]) {
    $.ajax({ type: 'POST', url: '/api/game/' + gameId, dataType: 'json', data: { x: m.x, y: m.y } });
  }
});

game.on('ko.new', function (m) {
  goban.drawStone('square', m.x, m.y);
});

$(hudContainer + ' .back').on('click', function () { game.back(); });
$(hudContainer + ' .next').on('click', function () { game.next(); });
$(hudContainer + ' .pass').on('click', function () { game.pass(); });

$(document).on('keydown', function (evt) {
  if (evt.keyCode === 37) { game.back(); }
  if (evt.keyCode === 39) { game.next(); }
});

// Server warns us of a played move
socket.on('game.movePlayed', function (m) {
  movesReceivedFromServer[m.x + '-' + m.y] = true;
  game.playStone(m.x, m.y);
});


