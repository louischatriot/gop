var Nedb = require('nedb')
  , challenges = new Nedb({ filename: './data/challenges.nedb', autoload: true })
  , routes = {}
  ;


routes.openChallenges = function (req, res) {
  challenges.find({}, function (err, challengesList) {
    if (err) { return res.status(500).json({ unexpected: err }) };

    res.locals.challengesList = challengesList;
    return res.render('open-challenges.jade');
  });
};


routes.createChallenge = function (req, res) {
  challenges.insert({ player: Math.random(), size: Math.random() > 0.5 ? 19 : 9, time: Math.random() }, function (err) {
    if (err) {
      return res.status(500).json({ unexpected: err });
    } else {
      return res.status(200).json({});
    }
  });
};




// Interface
module.exports = routes;
