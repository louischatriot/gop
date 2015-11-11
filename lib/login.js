var google = require('googleapis')
  , async = require('async')
  , OAuth2 = google.auth.OAuth2
  , config = require('./config')
  , creds = require('./google-auth-creds')
  , url = require('url')
  , oauth2Client = new OAuth2( creds.clientId
                             , creds.clientSecret
                             , url.resolve(config.host, '/googleauth'))
  , users = require('./users')
  ;

google.options({ auth: oauth2Client });

function initialRequest (req, res) {
  var url = oauth2Client.generateAuthUrl({ scope: ['https://www.googleapis.com/auth/userinfo.email'] });
  req.session.gAuthReturnUrl = req.originalUrl === '/login' ? '/web/open-challenges' : req.originalUrl;
  return res.redirect(302, url);
}


function returnFromGoogle (req, res) {
  oauth2Client.getToken(req.query.code, function(err, tokens) {
    if(err) {
      res.locals.loginError = "Can't get credentials from Google servers";
      return res.render('front-page.jade');
    }

    oauth2Client.setCredentials(tokens);
    google.oauth2('v2').userinfo.get(function (err, response) {
      if (err) {
        res.locals.loginError = "Can't get credentials from Google servers";
        return res.render('front-page.jade');
      }

      if (!response.email || (config.authorizedLoggedDomain && !response.email.match(new RegExp(config.authorizedLoggedDomain + '$')))) {
        res.locals.loginError = "Can't login from non " + config.authorizedLoggedDomain + " accounts";
        return res.render('front-page.jade');
      }

      // Get user if he exists or create him on the fly
      async.waterfall([
        function (next) {
          users.getUserFromEmail(response.email, function (err, user) {
            // TODO: handle err

            if (user) {
              req.session.user = user;
              return next();
            } else {
              // Best guess of user name
              var name;
              if (response.name) {
                name = response.name;
              } else if (response.given_name) {
                name = response.given_name;
                if (response.family_name) { name += " " + response.family_name; }
              } else {
                name = response.email.match(/([^@]+)@.*/)[1];
              }

              users.createUser({ email: response.email, name: name }, function (err, newUser) {
                // TODO: handle err

                req.session.user = newUser;
                return next();
              });
            }
          });
        },
        function (next) {
          var url = req.session.gAuthReturnUrl;
          delete req.session.gAuthReturnUrl;
          return res.redirect(302, url);
        }
      ]);
    });
  });
}


function logout (req, res) {
  delete req.session.user;
  return res.redirect(302, '/');
}


// Interface
module.exports.initialRequest = initialRequest;
module.exports.returnFromGoogle = returnFromGoogle;
module.exports.logout = logout;


