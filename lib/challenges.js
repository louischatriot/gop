var Nedb = require('nedb')
  , challenges = new Nedb({ filename: './data/challenges.nedb', autoload: true })
  , realtime = require('./realtime')
  , openChallenges = {}
  , routes = {}
  ;


routes.openChallenges = function (req, res) {
  challenges.find({ _id: { $in: realtime.getAllOpenChallengesIds() } }, function (err, challengesList) {
    if (err) { return res.status(500).json({ unexpected: err }) };

    console.log(challengesList);

    res.locals.challengesList = challengesList;
    return res.render('open-challenges.jade');
  });
};


routes.createChallenge = function (req, res) {
  // TODO: let user set his own challenge parameters of course
  challenges.insert({ player: Math.random(), size: Math.random() > 0.5 ? 19 : 9, time: Math.random() }, function (err, newChallenge) {
    if (err) {
      return res.status(500).json({ unexpected: err });
    } else {
      return res.status(200).json({ redirectUrl: '/web/challenge/' + newChallenge._id });
    }
  });
};

routes.openChallenge = function (req, res) {
  console.log("Connected to challenge with id " + req.params.id);

  //realtime.io.join(req.params.id);
  //console.log(realtime.sockets[req.session.user._id]);

  //setTimeout(function () {
    //realtime.sockets[req.session.user._id].emit('connectedUsers.change', { hello: 'world' });
  //}, 2000);

  res.locals.challengeId = req.params.id;
  res.render('challenge.jade');
};




// Interface
module.exports = routes;
