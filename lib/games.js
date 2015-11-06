var db = require('./db')
  , realtime = require('./realtime')
  , async = require('async')
  , routes = {}
  , GameEngine = require('../assets/js/gameEngine')
  ;

/**
 * Display play page
 * Detect if game is going, or this is a first time join (create game on the fly then)
 */
routes.game = function (req, res) {
  async.waterfall([
    // If game doesn't exist, create it on the fly and notify the challenge creator
    function (next) {
      db.games.findOne({ _id: req.params.id }, function (err, game) {
        // TODO: handle err
        if (game) { return next(null, game); }

        var userSockets = realtime.getChallengePlayersSockets(req.params.id);
        var userIds = Object.keys(userSockets);

        // No challenge found, user error (probably tried to craft a url or creator left)
        if (userIds.length === 0) { return res.redirect('/'); }

        var creatorId = userIds[0];   // Should never be more than one anyway
        if (creatorId === req.session.user._id) { return res.redirect('/web/challenge/' + req.params.id); }   // Don't play against yourself

        db.users.findOne({ _id: creatorId }, function (err, creator) {
          db.challenges.findOne({ _id: req.params.id}, function (err, challenge) {
            // TODO: handle err, creator or challenge empty

            var gameData = { _id: req.params.id
                           , blackPlayerId: creatorId
                           , blackPlayerName: creator.name
                           , whitePlayerId: req.session.user._id
                           , whitePlayerName: req.session.user.name
                           , status: db.games.statuses.ONGOING
                           , moves: []
                           , name: challenge.name
                           , size: challenge.size
                           };

            db.games.insert(gameData, function (err, newGame) {
              db.challenges.remove({ _id: req.params.id }, {}, function () {
                userSockets[userIds[0]].forEach(function (socket) {
                  socket.emit('challenger.connected');
                });
                return next(null, newGame);
              });
            });
          });
        });
      });
    },
    // Game exists in all cases, display corresponding page
    function (game) {
      // TODO: send game state

      res.locals.game = game;
      res.locals.moves = JSON.stringify(game.moves);
      if (req.session.user._id === game.blackPlayerId) { res.locals.canPlay = 'black'; }
      if (req.session.user._id === game.whitePlayerId) { res.locals.canPlay = 'white'; }
      return res.render('game.jade');
    }
  ]);
};


// TODO: send game status upon game join (race condition can yield inconsistent state)


/*
 * Warn server that a move was played
 * Server then broadcasts whole game status to all watchers (players included)
 * This is the simplest way to keep server and clients in sync, need to see how it behaves under load
 * It might be necessary to use a smarter, signature-based sync mechanism
 *
 */
routes.playApi = function (req, res) {
  var move = req.body.move;

  db.games.findOne({ _id: req.params.id }, function (err, game) {
    if (err || !game) { return res.status(404).json({ message: "Game not found" }); }
    if (req.session.user._id !== game.blackPlayerId && req.session.user._id !== game.whitePlayerId) { return res.status(401).json({ message: "You are not a player in this game" }); }

    // Might need to keep up to date in memory cache of gameEngines if this proves to be a bottleneck
    var gameEngine = new GameEngine({ size: game.size });
    game.moves.forEach(function (move) {
      gameEngine.play(move);
    });

    if (!(req.session.user._id === game.blackPlayerId && gameEngine.currentPlayer === GameEngine.players.BLACK) && !(req.session.user._id === game.whitePlayerId && gameEngine.currentPlayer === GameEngine.players.WHITE)) {
      return res.status(403).json({ message: "Playing out of turn" });
    }

    if (move !== GameEngine.moves.PASS && move !== GameEngine.moves.RESIGN) {
      move.x = parseInt(move.x, 10);
      move.y = parseInt(move.y, 10);
      if (!gameEngine.isMoveValid(move.x, move.y)) {
        return res.status(403).json({ message: "You tried to play an invalid move" });
      }
    }

    gameEngine.play(move);
    db.games.update({ _id: game._id }, { $push: { moves: move } }, {}, function () {
      // TODO: handle err
      var socketsByPlayer = realtime.getGamePlayersSockets(req.params.id);

      Object.keys(socketsByPlayer).forEach(function (userId) {
        socketsByPlayer[userId].forEach(function (socket) {
          socket.emit('game.movePlayed', { moves: gameEngine.moves });
        });
      });

      return res.status(200).json({})
    });
  });
};


// Interface
module.exports = routes;
