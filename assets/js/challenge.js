var roomName = $('#challenge-id').html();


console.log(socket);

//socket.join(roomName);

socket.on('connectedUsers.change', function (m) {
  console.log("----------------");
  console.log(m);
});







// Page should look like the play page
var gobanContainer = "#the-goban", hudContainer = "#hud";
var game = new Game({ size: 19 });
var goban = new Goban({ size: 19, container: gobanContainer, game: game });
