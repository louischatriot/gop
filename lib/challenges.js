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
  if (!req.session.user) { return res.status(401).json({ message: 'Must be logged in' }); }

  db.challenges.findOne({ _id: req.params.id }, function (err, challenge) {
    if (err || !challenge) { return res.status(404).json({ message: "Challenge not found" }); }
    if (req.session.user._id !== challenge.creatorId && req.session.user._id !== challenge.currentChallengerId) { return res.status(401).json({ message: 'Only creator and current challenger can change challenge parameters' }); }

    var changed = false
      , updateQuery = { $set: {} }
      , isCreator = req.session.user._id === challenge.creatorId
      ;

    // Should also check the challenger given by challenge creator actually challenged but no bad side effect can happen if someone tries to manipulate the server like so
    if (isCreator && req.body.challengerId && (challenge.currentChallengerId !== req.body.challengerId)) {
      changed = true;
      updateQuery.$set.currentChallengerId = req.body.challengerId;
    }

    if (req.body.handicap && (req.body.handicap !== challenge.handicap)) {
      changed = true;
      updateQuery.$set.handicap = req.body.handicap;
    }

    // Modifying user automatically agrees with himself and other party agrees iif nothing was changed
    if (isCreator) {
      updateQuery.$set.creatorOK = true;
      if (changed) { updateQuery.$set.currentChallengerOK = false; }
    } else {
      updateQuery.$set.currentChallengerOK = true;
      if (changed) { updateQuery.$set.creatorOK = false; }
    }

    db.challenges.update({ _id: challenge._id }, updateQuery, {}, function () {
      db.challenges.findOne({ _id: challenge._id }, function (err, challenge) {
        if (challenge.creatorOK && challenge.currentChallengerOK) {
          realtime.emit('challenge.accepted', { challenge: challenge });
        }

        realtime.broadcast('challenge.' + challenge._id + '.modified', { challenge: challenge });
        return res.status(200).json({});
      });
    });
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
  challengePlayersChange(challengeId);

  socket.on('disconnect', function () {
    openChallenges[challengeId][user._id] = miscUtils.removeFrom(openChallenges[challengeId][user._id], socket);
    if (openChallenges[challengeId][user._id].length === 0) { delete openChallenges[challengeId][user._id]; }
    if (Object.keys(openChallenges[challengeId]).length === 0) { delete openChallenges[challengeId]; }
    openChallengesChange();
    challengePlayersChange(challengeId);
  });
});

function openChallengesChange () {
  var openChallengesIds = Object.keys(openChallenges);
  db.challenges.find({ _id: { $in: openChallengesIds } }, function (err, openChallenges) {
    if (err) { return; }   // Don't notify if database error
    realtime.broadcast('openChallenges.change', { openChallenges: openChallenges });
  });
}

// If any error happens, do nothing. Should really handle errors betters if that were a "serious" project...
function challengePlayersChange (challengeId) {
  if (!openChallenges[challengeId]) { return; }   // If no one connected to this challenge anymore, do nothing

  db.challenges.findOne({ _id: challengeId }, function (err, challenge) {
    if (err || !challenge) { return; }

    var challengersIds = Object.keys(openChallenges[challengeId]);

    // If creator left, cancel challenge
    if (challengersIds.indexOf(challenge.creatorId) === -1) {
      db.challenges.remove({ _id: challenge._id }, function () {
        realtime.broadcast('challenge.' + challenge._id + '.canceled');
      });
      return;
    }

    challengersIds = miscUtils.removeFrom(challengersIds, challenge.creatorId);
    db.users.find({ _id: { $in: challengersIds } }, { _id: 1, name: 1 }, function (err, challengers) {
      if (err) { return; }

      // Update challengers and current challenger if set for first time or unset
      // TODO: test with multiple challengers
      var updateQuery = { $set: { challengers: challengers } };
      if (challenge.currentChallengerId && challengersIds.indexOf(challenge.currentChallengerId) === -1) {
        updateQuery.$unset = { currentChallengerId: true };
        updateQuery.$set.creatorOK = false;
        updateQuery.$set.currentChallengerOK = false;
      }
      if (!challenge.currentChallengerId && challengers.length > 0) {
        updateQuery.$set.currentChallengerId = challengers[0]._id;
      }
      db.challenges.update({ _id: challenge._id }, updateQuery, {}, function (err) {
        if (err) { return; }
        db.challenges.findOne({ _id: challengeId }, function (err, challenge) {
          if (err) { return; }
          realtime.broadcast('challenge.' + challenge._id + '.modified', { challenge: challenge });
        });
      });
    });
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
