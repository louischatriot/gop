// Page should look like the play page
var gobanContainer = "#the-goban", hudContainer = "#hud";
var game = new Game({ size: 19 });
var goban = new Goban({ size: 19, container: gobanContainer, game: game });
