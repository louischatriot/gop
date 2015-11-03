var Nedb = require('nedb')
  , challenges = new Nedb({ filename: './data/challenges.nedb', autoload: true })
  , realtime = require('./realtime')
  , routes = {}
  ;

/**
 * Open challenges page
 */
routes.openChallenges = function (req, res) {
  challenges.find({ _id: { $in: realtime.getAllOpenChallengesIds() } }, function (err, openChallenges) {
    if (err) { return res.status(500).json({ unexpected: err }) };
    res.locals.openChallenges = JSON.stringify({ openChallenges: openChallenges });
    return res.render('open-challenges.jade');
  });
};


/*
 * Create new challenge, for now creator is always black
 */
routes.createChallenge = function (req, res) {
  req.body.creatorId = req.session.user._id;
  req.body.creatorName = req.session.user.name;
  req.body.dateCreated = new Date();

  // TODO: server-side validation
  challenges.insert(req.body, function (err, newChallenge) {
    if (err) {
      return res.status(500).json({ unexpected: err });
    } else {
      return res.status(200).json({ redirectUrl: '/web/challenge/' + newChallenge._id });
    }
  });
};


/*
 * Waiting page when opponent is not yet selected
 */
routes.openChallenge = function (req, res) {
  res.locals.challengeId = req.params.id;
  res.render('challenge.jade');
};


/*
 * Real time updating of the challenges page and players matching
 */
realtime.on('openChallenges.change', function (m) {
  challenges.find({ _id: { $in: realtime.getAllOpenChallengesIds() } }, function (err, openChallenges) {
    // TODO: handle err
    realtime.broadcast('openChallenges.change', { openChallenges: openChallenges });
  });
});



// Interface
module.exports = routes;
