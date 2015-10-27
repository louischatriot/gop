var gobanContainer = "#the-goban", hudContainer = "#hud";

var game = new Game({ size: 19
                    , goban: true
                    , gobanOptions: { container: gobanContainer }
                    });

game.on('captured.change', function (m) {
  $(hudContainer + ' .captured-' + m.player).html(m.captured);
});

game.on('currentPlayer.change', function (m) {
  if (!m.finished) {
    $(hudContainer + ' .turn').html('Turn: ' + m.currentPlayer);
  } else {
    $(hudContainer + ' .turn').html('Game finished');
  }
});

game.on('currentMove.change', function (m) {
  var msg;

  if (m.finished) {
    msg = 'Move ' + m.currentMove + ' - game finished';
  } else if (m.pass) {
    msg = 'Move ' + m.currentMove + ' - ' + m.player + ' passed';
  } else if (m.currentMove === 0) {
    msg = "No move played yet";
  } else {
    msg = 'Move ' + m.currentMove + ' - ' + m.player + ' ' + m.x + '-' + m.y;
  }

  $(hudContainer + ' .move-number').html(msg);
});

$(hudContainer + ' .back').on('click', function () { game.back(); });
$(hudContainer + ' .next').on('click', function () { game.next(); });
$(hudContainer + ' .pass').on('click', function () { game.pass(); });

$(document).on('keydown', function (evt) {
  if (evt.keyCode === 37) { game.back(); }
  if (evt.keyCode === 39) { game.next(); }
});



