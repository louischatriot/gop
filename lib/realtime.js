/**
 * For now, put all real time management stuff in here, will probably need to better structure this later on
 * The realtime.initialize function is given the io object tied to the express server
 *
 * Events Emitted
 * * connectedUsers.change - { connectedUsersIds }
 * * openChallenges.change - { challengeId } - challengeId is the challenge that was modified
 */

var middlewares = require('./middlewares')
  , config = require('./config')
  , disconnectTimeouts = {}   // Don't count a user as disconnect right after disconnect event as a page refresh fires a disconnect then reconnect event
  , connectedUsers = {}   // Real time list of connected users with all their sockets
  , openChallenges = {}   // openChallenges[challengeId][userId] gives the list of sockets from userId on challengeId page
  , openGames = {}   // openGames[gameId][userId] gives the list of sockets from userId on gameId page
  ;

// TODO: move to a utility module
function removeFrom (array, element) {
  if (!array) { return [] };
  var res = [];
  array.forEach(function (e) { if (e !== element) { res.push(e); } });
  return res;
}


function Realtime () { }
require('util').inherits(Realtime, require('events'));

Realtime.prototype.initialize = function (_io) {
  var self = this;
  // Don't initialize twice
  if (this.initialized) { return; } else { this.initialized = true; }

  // Save pointer for future reference
  this.io = _io;

  // Shared session middleware
  this.io.use(function (socket, next) {
    middlewares.session(socket.request, socket.request.res, next);
  });

  this.io.on('connection', function (socket) {
    if (socket.request.session.user) {
      var user = socket.request.session.user;

      // Handle connected users status
      clearTimeout(disconnectTimeouts[user._id]);
      if (!connectedUsers[user._id]) { connectedUsers[user._id] = []; }
      connectedUsers[user._id].push(socket);
      self.emit('connectedUsers.change', self.getAllConnectedUsersIds());

      socket.on('disconnect', function () {
        connectedUsers[user._id] = removeFrom(connectedUsers[user._id], socket);
        if (connectedUsers[user._id].length === 0) {   // If some sockets remain the user still has a page open
          delete connectedUsers[user._id];
          disconnectTimeouts[user._id] = setTimeout(function () {
            self.emit('connectedUsers.change', self.getAllConnectedUsersIds());
          }, config.disconnectTimeout);
        }
      });

      // Handle open challenges
      var challengeCheck = socket.handshake.headers.referer.match(new RegExp(config.host + '/web/challenge/([^\/]+)'));
      if (challengeCheck) {
        var challengeId = challengeCheck[1];
        if (!openChallenges[challengeId]) { openChallenges[challengeId] = {}; }
        if (!openChallenges[challengeId][user._id]) { openChallenges[challengeId][user._id] = []; }
        openChallenges[challengeId][user._id].push(socket);
        self.emit('openChallenges.change');

        socket.on('disconnect', function () {
          openChallenges[challengeId][user._id] = removeFrom(openChallenges[challengeId][user._id], socket);
          if (openChallenges[challengeId][user._id].length === 0) { delete openChallenges[challengeId][user._id]; }
          if (Object.keys(openChallenges[challengeId]).length === 0) { delete openChallenges[challengeId]; }
          self.emit('openChallenges.change');
        });
      }

      // Handle open games
      var gameCheck = socket.handshake.headers.referer.match(new RegExp(config.host + '/web/play/([^\/]+)'));
      if (gameCheck) {
        var gameId = gameCheck[1];
      }
    }
  });
}

Realtime.prototype.broadcast = function (event, message) {
  this.io.emit(event, message);
};

Realtime.prototype.getAllOpenChallengesIds = function () {
  return Object.keys(openChallenges);
};

Realtime.prototype.getAllConnectedUsersIds = function () {
  return Object.keys(connectedUsers);
};

Realtime.prototype.getChallengePlayersIds = function(challengeId) {
  if (challengeId && openChallenges[challengeId]) {
    return Object.keys(openChallenges[challengeId]);
  } else {
    return [];
  }
};


// Logging for development
function printOpenChallenges () {
  console.log(Object.keys(openChallenges).length + ' challenges');
  Object.keys(openChallenges).forEach(function (challengeId) {
    console.log('* ' + challengeId + ' - ' + Object.keys(openChallenges[challengeId]).length);
  });
}



// Interface
module.exports = new Realtime();   // Singleton
