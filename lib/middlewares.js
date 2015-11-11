var login = require('./login')
  , config = require('./config')
  , session = require('express-session')
  , SessionStore = require('express-nedb-session')(session)
  //, RedisStore = require('connect-redis')(session)
  ;

// Log wall, if trying to access a webapp page while not logged, force logging
// Then display requested page
function mustBeLoggedIn (req, res, next) {
  if (config.loginNotRequired) {
    res.locals.username = 'TESTING';
    return next();
  }

  if (!req.session.user) {
    return login.initialRequest(req, res);
  } else {
    res.locals.username = req.session.user.name || 'Unknown user';
    return next();
  }
}

// API log wall, simply send a 401 if call is not logged
function apiMustBeLoggedIn (req, res, next) {
  if (config.loginNotRequired) {
    return next();
  }

  if (!req.session.user) {
    return res.status(401).json({ messages: ['You must be logged in'] });
  } else {
    return next();
  }
}

function addCommonLocals (req, res, next) {
  res.locals[req.url.substring(1)] = true;   // Add page name
  res.locals.host = config.host;
  return next();
}

// Persistent sessions using NeDB. If usage becomes too high, switch to Redis for backing.
// Middleware shared with socket.io for authentication purposes
session = session({ secret: 'efsdpsfsdufsdb'
                  , resave: false
                  , saveUninitialized: false
                  , rolling: true
                  , cookie: { path: '/', httpOnly: true, secure: false, maxAge: new Date(Date.now() + 365 * 24 * 3600 * 1000) }   // 1 year validity
                  , store: new SessionStore({ filename: './data/sessions.nedb' })
                  //, store: new RedisStore({ host: 'localhost', port: 6379 })
                  });

// Interface
module.exports.mustBeLoggedIn = mustBeLoggedIn;
module.exports.apiMustBeLoggedIn = apiMustBeLoggedIn;
module.exports.addCommonLocals = addCommonLocals;
module.exports.session = session;

