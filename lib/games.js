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
                           , name: challenge.name
                           , size: challenge.size
                           };

            db.games.insert(gameData, function (err, newGame) {
              db.challenges.remove({ _id: req.params.id }, {}, function () {
                userSockets[userIds[0]].forEach(function (socket) {
                  socket.emit('challenger.connected');
                });
                gameCreatedOrFinished();
                return next(null, newGame);
              });
            });
          });
        });
      });
    },
    // Game exists in all cases, display corresponding page
    function (game) {
      // TODO: check that all fields are rightly HTML-encoded
      res.locals.game = game;
      if (req.session.user._id === game.blackPlayerId) { res.locals.canPlay = 'black'; }
      if (req.session.user._id === game.whitePlayerId) { res.locals.canPlay = 'white'; }
      return res.render('game.jade');
    }
  ]);
};


/**
 * Return whole game state (used to synchronize client with server if connection was lost)
 */
routes.getGameStateApi = function (req, res) {
  db.games.findOne({ _id: req.params.id }, function (err, game) {
    if (err || !game) { return res.status(404).json({ message: "Game not found" }); }
    return res.status(200).json({ moves: game.moves, currentMoveNumber: game.currentMoveNumber });
  });
};


/**
 * Warn server that reviewer has changed focus
 * TODO: implement reviewer check
 */
routes.changeFocusApi = function (req, res) {
  var currentMoveNumber = req.body.currentMoveNumber;

  // Check parameters

  db.games.findOne({ _id: req.params.id }, function (err, game) {
    if (err || !game) { return res.status(404).json({ message: "Game not found" }); }

    // Async
    db.games.update({ _id: game._id }, { $set: { currentMoveNumber: currentMoveNumber } }, {}, function () { });

    var data = { currentMoveNumber: currentMoveNumber };
    realtime.broadcast('game.' + game._id + '.stateChanged', data);

    return res.status(200).json({});
  });
};


/*
 * Warn server that a move was played
 * Server then broadcasts diff to all connected users
 * Sync issues are the clients responsibility
 */
routes.playApi = function (req, res) {
  var move = req.body.move;

  // TODO: Check parameters

  db.games.findOne({ _id: req.params.id }, function (err, game) {
    if (err || !game) { return res.status(404).json({ message: "Game not found" }); }
    if (req.session.user._id !== game.blackPlayerId && req.session.user._id !== game.whitePlayerId) { return res.status(401).json({ message: "You are not a player in this game" }); }

    // Might need to keep up to date in memory cache of gameEngines if this proves to be a bottleneck
    var gameEngine = new GameEngine({ size: game.size });
    gameEngine.replaceGameTree(GameEngine.Move.deserialize(game.moves));
    gameEngine.backToMove(req.body.previousMoveN);

    //if (!(req.session.user._id === game.blackPlayerId && gameEngine.currentPlayer === GameEngine.players.BLACK) && !(req.session.user._id === game.whitePlayerId && gameEngine.currentPlayer === GameEngine.players.WHITE)) {
      //return res.status(403).json({ message: "Playing out of turn" });
    //}

    if (move.type === GameEngine.Move.types.STONE) {
      if (!gameEngine.isMoveValid(move.x, move.y)) {
        return res.status(403).json({ message: "You tried to play an invalid move" });
      }
    }

    var playedMove = gameEngine.play(move);
    var serializedMoves = gameEngine.movesRoot.serialize();
    db.games.update({ _id: game._id }, { $set: { moves: serializedMoves, currentMoveNumber: playedMove.n } }, {}, function () {
      // TODO: handle err
      var socketsByPlayer = realtime.getGamePlayersSockets(req.params.id);

      // Only send move that was played. If a client is not in sync, he will request the whole game tree
      // TODO: don't send this data to player who just played
      var data = { playedMove: playedMove.getOwnData(), currentMoveNumber: playedMove.n, parentMoveNumber: playedMove.parent.n };
      realtime.broadcast('game.' + game._id + '.stateChanged', data);

      // Done asynchronously as the caller of this API end point cannot be on the games page
      if (gameEngine.isGameFinished()) {
        db.games.update({ _id: game._id }, { $set:{ status: db.games.statuses.FINISHED } }, {}, function () {
          gameCreatedOrFinished();
        });
      }

      return res.status(200).json({})
    });
  });
};


/**
 * List of games being played
 */
routes.games = function (req, res) {
  getCPGames(function (err, games) {
    if (err) { return res.status(500).json({ unexpected: err }); }
    res.locals.games = JSON.stringify(games);
    return res.render('games.jade');
  });
};


/*
 * Real time updating of the current games page when a new game is created or a game is finished
 * Should probably use an event for this. Maybe a central bus?
 */
function gameCreatedOrFinished () {
  getCPGames(function (err, games) {
    // TODO: handle err
    realtime.broadcast('games.change', games);
  });
}


/**
 * Give the lists of current and past games
 * TODO: list of past games will become too large some time, don't show all of them
 */
function getCPGames (cb) {
  db.games.find({ status: db.games.statuses.ONGOING }, function (err, currentGames) {
    db.games.find({ status: db.games.statuses.FINISHED }, function (err, pastGames) {
      // TODO: handle errors
      return cb(null, { currentGames: currentGames, pastGames: pastGames });
    });
  });
}





// Interface
module.exports = routes;
