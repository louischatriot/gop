var express = require('express')
  , app = express()
  , server = require('http').Server(app)
  , io = require('socket.io')(server)
  , bodyParser = require('body-parser')
  , config = require('./lib/config')
  , session = require('express-session')
  , SessionStore = require('express-nedb-session')(session)
  , middlewares = require('./lib/middlewares')
  , webapp = express.Router()
  , api = express.Router()
  , login = require('./lib/login')
  , challenges = require('./lib/challenges')
  , users = require('./lib/users')
  , sessionMiddleware
  ;

app.use(bodyParser.json());

// Persistent sessions using NeDB. If usage becomes too high, switch to Redis or Mongo for backing.
// Middleware shared with socket.io for authentication purposes
sessionMiddleware = session({ secret: 'efsdpsfsdufsdb'
                            , resave: false
                            , saveUninitialized: false
                            , store: new SessionStore({ filename: './data/sessions.nedb' })
                            });
app.use(sessionMiddleware);

// API
api.use(middlewares.apiMustBeLoggedIn);
api.get('/challenges', challenges.createChallenge);


// Auth with Google
app.get('/login', login.initialRequest);
app.get('/googleauth', login.returnFromGoogle);
app.get('/logout', login.logout);


// Web interface
webapp.use(middlewares.mustBeLoggedIn);
webapp.use(middlewares.addCommonLocals);
webapp.get('/create-game', function (req, res) { res.render('create-game.jade'); });
webapp.get('/play', function (req, res) { res.render('play.jade'); });
webapp.get('/open-challenges', challenges.openChallenges);
webapp.get('/players', users.allPlayersPage);


// Declare subrouters
app.use('/api', api);
app.use('/web', webapp);


// Root. Descriptive main page if not logged, main action (create a mapping) if logged
app.get('/', function (req, res) {
  if (req.session.user) {
    return res.redirect(302, '/web/create-game');
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
});




// Shared session middleware
io.use(function (socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});


io.on('connection', function (socket) {
  if (socket.request.session.user) {
    users.userConnected(socket.request.session.user);
  }

  socket.on('disconnect', function () {
    users.userDisconnected(socket.request.session.user);
  });
});




server.listen(config.serverPort);

