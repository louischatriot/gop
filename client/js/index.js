var game = new Game({ size: 6
                    , goban: true
                    , gobanOptions: { gobanSize: '100%', container: '#the-goban' }
                    });

game.play(2, 2);
game.play(1, 2);
game.play(1, 3);



$('#test').on('click', function () {
  var group = game.getGroup(1, 2);

  console.log("================================");
  var liberties = game.groupLiberties(group);
  console.log(liberties);
});



