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
 */
routes.playApi = function (req, res) {
  db.games.findOne({ _id: req.params.id }, function (err, game) {
    if (err || !game) { return res.status(404).json({ message: "Game not found" }); }
    if (req.session.user._id !== game.blackPlayerId && req.session.user._id !== game.whitePlayerId) { return res.status(401).json({ message: "You are not a player in this game" }); }

    var gameEngine = new GameEngine({ size: game.size });
    var x = parseInt(req.body.x, 10);
    var y = parseInt(req.body.y, 10);

    game.moves.forEach(function (move) {
      // TODO: handle passes and give ups
      gameEngine.playStone(move.x, move.y);
    });

    if (!gameEngine.isMoveValid(x, y)) { return res.status(403).json({ message: "You tried to play an invalid move" }); }

    db.games.update({ _id: game._id }, { $push: { moves: { x: x, y: y } } }, {}, function () {
      // TODO: handle err
      var socketsByPlayer = realtime.getGamePlayersSockets(req.params.id);

      Object.keys(socketsByPlayer).forEach(function (userId) {
        socketsByPlayer[userId].forEach(function (socket) {
          socket.emit('game.movePlayed', { x: x, y: y });
        });
      });

      return res.status(200).json({})
    });
  });
};


// Interface
module.exports = routes;
