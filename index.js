var express = require('express')
  , app = express()
  , server = require('http').Server(app)
  , io = require('socket.io')(server)
  , webapp = express.Router()
  , api = express.Router()
  , bodyParser = require('body-parser')
  , config = require('./lib/config')
  , middlewares = require('./lib/middlewares')
  , login = require('./lib/login')
  , challenges = require('./lib/challenges')
  , games = require('./lib/games')
  , users = require('./lib/users')
  , realtime = require('./lib/realtime')
  ;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(middlewares.session);

// API
api.use(middlewares.apiMustBeLoggedIn);
api.post('/create-challenge', challenges.createChallenge);
api.post('/game/:id', games.gamePlayApi);
api.get('/game/:id/state', games.getGameStateApi);
api.get('/game/:id/undo', games.askForUndo);
api.post('/game/:id/mark-dead', games.markAsDead);
api.post('/game/:id/agree-on-deads', games.agreeOnDeads);
api.post('/review/:id', games.reviewPlayApi);
api.post('/review/:id/focus', games.changeReviewFocusApi);
api.get('/review/:id/state', games.getReviewStateApi);


// Auth with Google
app.get('/login', login.initialRequest);
app.get('/googleauth', login.returnFromGoogle);
app.get('/logout', login.logout);


// Web interface
webapp.use(middlewares.mustBeLoggedIn);
webapp.use(middlewares.addCommonLocals);
webapp.get('/challenge/:id', challenges.openChallenge);
webapp.get('/game/:id', games.game);
webapp.get('/review/new', games.createReview);
webapp.get('/review/:id', games.review);
webapp.get('/open-challenges', challenges.openChallenges);
webapp.get('/players', users.allPlayersPage);
webapp.get('/games', games.games);


// Declare subrouters
app.use('/api', api);
app.use('/web', webapp);


// Root. Descriptive main page if not logged, main action (create a mapping) if logged
app.get('/', function (req, res) {
  if (req.session.user) {
    return res.redirect(302, '/web/open-challenges');
  } else {
    return res.render('front-page.jade');
  }
});


// Serve static client-side js and css
// TODO: use Nginx to serve static assets
app.get('/assets/*', function (req, res) {
  res.sendFile(process.cwd() + req.url);
});



// Last wall of defense against a bad crash
process.on('uncaughtException', function (err) {
  console.log('Caught an uncaught exception, I should probably send an email or something');
  console.log(err);
  if (err.stack) { console.log(err.stack); }
});


// Tie socket.io to express server then launch the latter
realtime.initialize(io)
server.listen(config.serverPort);

