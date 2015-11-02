/*
 * User schema
 * * _id
 * * email
 * * name
 * * dateCreated
 */

var Nedb = require('nedb')
  , users = new Nedb({ filename: './data/users.nedb', autoload: true })
  , realtime = require('./realtime')
  , connectedUsers = {}
  ;

users.ensureIndex({ fieldName: 'email', unique: true });

/**
 * Get user from email
 * cb(err, user)
 */
function getUserFromEmail (email, cb) {
  users.find({ email: email }, function (err, res) {
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
  users.insert(user, function (err, newUser) { return cb(err, newUser); });   // Coerce signature
}

/*
 * Keep connected users list up to date in real time
 * TODO: use events instead
 */
function userConnected(user) {
  connectedUsers[user._id] = user;
  notifyConnectedListChange();
}

function userDisconnected(user) {
  if (user._id) { delete connectedUsers[user._id]; }
  notifyConnectedListChange();
}

/**
 * Notify all connected clients that the list of connected users has changed
 * For now just send the whole list everytime. If usage increases it will break (too much data)
 * and we'll need to implement a differential mechanism instead
 * Also a notification will be sent every time a connected user loads a new page. Use a small timeout instead if load increases too much
 */
function notifyConnectedListChange() {
  // Debug logging
  console.log("=========================");
  Object.keys(connectedUsers).forEach(function (_id) {
    console.log(connectedUsers[_id].email);
  });




  var m = { connectedUsers: [] };
  Object.keys(connectedUsers).forEach(function (_id) { m.connectedUsers.push(connectedUsers[_id]); });
  users.find({ $not: { _id: { $in: Object.keys(connectedUsers) } } }, function (err, disconnectedUsers) {
    m.disconnectedUsers = disconnectedUsers;
    realtime.broadcast('connectedUsers.change', m);
  });
}


/**
 * Page showing all players
 */
function allPlayersPage(req, res) {
  users.find({ $not: { _id: { $in: Object.keys(connectedUsers) } } }, function (err, disconnectedUsers) {
    //TODO: handle err

    res.locals.disconnectedUsers = disconnectedUsers;
    res.locals.connectedUsers = [];
    Object.keys(connectedUsers).forEach(function (_id) { res.locals.connectedUsers.push(connectedUsers[_id]); });
    return res.render('players.jade');
  });
}


// Interface
module.exports.getUserFromEmail = getUserFromEmail;
module.exports.createUser = createUser;
module.exports.allPlayersPage = allPlayersPage;
module.exports.userConnected = userConnected;
module.exports.userDisconnected = userDisconnected;


