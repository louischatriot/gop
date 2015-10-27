var express = require('express')
  , app = express()
  , server = require('http').Server(app)
  , bodyParser = require('body-parser')
  , config = require('./lib/config')
  , session = require('express-session')
  , middlewares = require('./lib/middlewares')
  , webapp = express.Router()
  , api = express.Router()
  , login = require('./lib/login')
  ;

// Initialize Express server and session
// Right now the session store is a simple in memory key value store and gets erased
// on restart. TODO: use a Redis-backed one
app.use(bodyParser.json());
app.use(session({ secret: 'eropcwnjdi'
                , resave: true
                , saveUninitialized: true
                }));


// API
api.use(middlewares.apiMustBeLoggedIn);
//api.post('/mappings', mappings.createMapping);
app.use('/api', api);


// Auth with Google
app.get('/login', login.initialRequest);
app.get('/googleauth', login.returnFromGoogle);
app.get('/logout', login.logout);


// Web interface
webapp.use(middlewares.mustBeLoggedIn);
webapp.use(middlewares.addCommonLocals);
webapp.get('/create-game', function (req, res) { res.render('create-game.jade'); });
webapp.get('/play', function (req, res) { res.render('play.jade'); });
app.use('/web', webapp);


// Root. Descriptive main page if not logged, main action (create a mapping) if logged
app.get('/', function (req, res) {
  if (req.session.user) {
    return res.redirect(302, '/web/create');
  } else {
    return res.render('main.jade');
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


server.listen(config.serverPort);

