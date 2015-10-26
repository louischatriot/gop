var game = new Game({ size: 6
                    , goban: true
                    , gobanOptions: { gobanSize: '45%' }
                    });

game.play('black', 2, 2);
game.play('white', 1, 2);
game.play('black', 1, 3);



$('#test').on('click', function () {
  var group = game.getGroup(1, 2);
  //console.log(group);


  var liberties = game.groupLiberties(group);
  console.log(liberties);
});



