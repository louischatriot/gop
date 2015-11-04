var db = require('./db')
  , realtime = require('./realtime')
  , routes = {}
  ;

/**
 * Display play page
 * Detect if game is going, or this is a first time join (create game on the fly then)
 */
routes.play = function (req, res) {
  console.log('--------------------------------------');
  console.log(req.params.id);
  console.log(req.session.user._id);

  var userIds = realtime.getChallengePlayersIds(req.params.id);

  console.log(userIds);

  // No challenge found, user error (probably tried to craft a url or creator left)
  if (userIds.length === 0) { res.redirect('/'); }


  res.render('play.jade');
};



// Interface
module.exports = routes;
