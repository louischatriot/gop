var gobanContainer = "#the-goban", hudContainer = "#hud";

var game = new Game({ size: 19
                    , goban: true
                    , gobanOptions: { container: gobanContainer }
                    });


$('#test').on('click', function () {
  var group = game.getGroup(1, 2);

  console.log("================================");
  var liberties = game.groupLiberties(group);
  console.log(liberties);
});


game.on('captured.change', function (m) {
  $(hudContainer + ' .captured-' + m.player).html(m.captured);
});

game.on('currentPlayer.change', function (m) {
  $(hudContainer + ' .turn').html(m.currentPlayer);
});

game.on('currentMove.change', function (m) {
  $(hudContainer + ' .move-number').html(m.currentMove);
});

$(hudContainer + ' .back').on('click', function () { game.back(); });
$(hudContainer + ' .next').on('click', function () { game.next(); });



