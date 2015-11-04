var db = require('./db')
  , realtime = require('./realtime')
  ;

/**
 * Get user from email
 * cb(err, user)
 */
function getUserFromEmail (email, cb) {
  db.users.find({ email: email }, function (err, res) {
    if (err) { return cb(err); }

    if (res.length === 1) {
      return cb(null, res[0]);
    } else {
      return cb(null, null);
    }
  });
}

/**
 * Create new user
 * cb(err, newUser)
 */
function createUser(opts, cb) {
  if (!opts.email) { return cb({ fieldMissing: 'email' }); }
  if (!opts.name) { return cb({ fieldMissing: 'name' }); }

  var user = { email: opts.email, name: opts.name, dateCreated: new Date() };
  db.users.insert(user, function (err, newUser) { return cb(err, newUser); });   // Coerce signature
}

/**
 * Page showing all players and real time updating of these lists
 * For now just send the whole list everytime. If usage increases it will break (too much data)
 * and we'll need to implement a differential mechanism instead
 */
function allPlayersPage(req, res) {
  userCDLists(realtime.getAllConnectedUsersIds(), function(err, m) {
    res.locals.connectedUsers = JSON.stringify(m.connectedUsers);
    res.locals.disconnectedUsers = JSON.stringify(m.disconnectedUsers);
    return res.render('players.jade');
  });
}

realtime.on('connectedUsers.change', function (connectedUsersIds) {
  userCDLists(connectedUsersIds, function(err, m) {
    realtime.broadcast('connectedUsers.change', m);
  });
});

function userCDLists (connectedUsersIds, cb) {
  var m = { connectedUsers: [], disconnectedUsers: [] };
  db.users.find({ _id: { $in: connectedUsersIds } }, function (err, connectedUsers) {
    db.users.find({ $not: { _id: { $in: connectedUsersIds } } }, function (err, disconnectedUsers) {
      m.connectedUsers = connectedUsers;
      m.disconnectedUsers = disconnectedUsers;
      return cb(null, m);
    });
  });

}



// Interface
module.exports.getUserFromEmail = getUserFromEmail;
module.exports.createUser = createUser;
module.exports.allPlayersPage = allPlayersPage;
