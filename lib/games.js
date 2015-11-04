var db = require('./db')
  , realtime = require('./realtime')
  , async = require('async')
  , routes = {}
  ;

/**
 * Display play page
 * Detect if game is going, or this is a first time join (create game on the fly then)
 */
routes.play = function (req, res) {
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
        var gameData = { _id: req.params.id
                       , blackPlayerId: creatorId
                       , whitePlayerId: req.session.user._id
                       };

        db.games.insert(gameData, function (err, newGame) {
          userSockets[userIds[0]].forEach(function (socket) {
            socket.emit('challenger.connected');
          });
          return next(null, newGame);
        });
      });
    },
    // Game exists in all cases, display corresponding page
    function (game) {
      return res.render('play.jade');
    }
  ]);
};



// Interface
module.exports = routes;
