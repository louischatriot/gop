var db = require('./db')
  , config = require('./config')
  , miscUtils = require('./miscUtils')
  , realtime = require('./realtime')
  , routes = {}
  ;

/**
 * Open challenges page
 */
routes.openChallenges = function (req, res) {
  db.challenges.find({ _id: { $in: Object.keys(openChallenges) } }, function (err, openChallenges) {
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

  // TODO: server-side validation
  db.challenges.insert(req.body, function (err, newChallenge) {
    if (err) {
      return res.status(500).json({ unexpected: err });
    } else {
      return res.status(200).json({ redirectUrl: '/web/challenge/' + newChallenge._id });
    }
  });
};


/*
 * Waiting page when opponent is not yet selected
 * Needs to correspond to an existing challenge of will redirect to main page
 */
routes.openChallenge = function (req, res) {
  db.challenges.findOne({ _id: req.params.id }, function (err, challenge) {
    if (err || !challenge) { return res.redirect(302, '/'); }
    if (!req.session.user) { return res.redirect(302, '/'); }

    res.locals.challengeAsJSON = JSON.stringify(challenge);
    res.locals.userAsJSON = JSON.stringify(req.session.user);
    res.render('challenge.jade');
  });
};


/**
 * API - Change challenge negotiable parameters
 */
routes.changeNegotiableParameters = function (req, res) {
  if (!req.session.user) { return res.status(401).send('Must be logged in'); }

  db.challenges.findOne({ _id: req.params.id }, function (err, challenge) {
    if (err || !challenge) { return res.redirect(302, '/'); }
    if (!req.session.user) { return res.redirect(302, '/'); }

    res.locals.challengeAsJSON = JSON.stringify(challenge);
    res.locals.userAsJSON = JSON.stringify(req.session.user);
    res.render('challenge.jade');
  });

};


/*
 * Real time updating of the challenges page and players matching
 */
var openChallenges = {};   // openChallenges[challengeId][userId] gives the list of sockets from userId on challengeId page

realtime.registerNewHandler(function(socket) {
  if (!socket.request.session.user) { return; }   // Don't handle non logged users
  var user = socket.request.session.user;
  var challengeCheck = socket.handshake.headers.referer.match(new RegExp(config.host + '/web/challenge/([^\/]+)'));
  if (!challengeCheck) { return; }

  var challengeId = challengeCheck[1];
  if (!openChallenges[challengeId]) { openChallenges[challengeId] = {}; }
  if (!openChallenges[challengeId][user._id]) { openChallenges[challengeId][user._id] = []; }
  openChallenges[challengeId][user._id].push(socket);
  openChallengesChange();

  socket.on('disconnect', function () {
    openChallenges[challengeId][user._id] = miscUtils.removeFrom(openChallenges[challengeId][user._id], socket);
    if (openChallenges[challengeId][user._id].length === 0) { delete openChallenges[challengeId][user._id]; }
    if (Object.keys(openChallenges[challengeId]).length === 0) { delete openChallenges[challengeId]; }
    openChallengesChange();
  });
});

function openChallengesChange () {
  var openChallengesIds = Object.keys(openChallenges);
  db.challenges.find({ _id: { $in: openChallengesIds } }, function (err, openChallenges) {
    if (err) { return; }   // Don't notify if database error
    realtime.broadcast('openChallenges.change', { openChallenges: openChallenges });
  });
}

// TODO: this uglyness will be removed once new challenge system in place
realtime.getChallengePlayersSockets = function (challengeId) {
  if (challengeId && openChallenges[challengeId]) {
    return (openChallenges[challengeId]);
  } else {
    return {};
  }
};



// Interface
module.exports = routes;
