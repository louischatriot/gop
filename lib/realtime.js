/**
 * For now, put all real time management stuff in here, will probably need to better structure this later on
 * The realtime.initialize function is given the io object tied to the express server
 */

var middlewares = require('./middlewares')
  , users = require('./users')
  , config = require('./config')
  , realtime = {}
  , disconnectTimeouts = {}   // Don't count a user as disconnect right after disconnect event as a page refresh fires a disconnect then reconnect event
  , sockets = {}   // Real time list of sockets indexed by user _id
  , openChallenges = {}   // openChallenges[challengeId][userId] gives the list of sockets from userId on page challenge for challengeId
  , io
  ;

function removeFrom (array, element) {
  if (!array) { return [] };
  var res = [];
  array.forEach(function (e) { if (e !== element) { res.push(e); } });
  return res;
}

//function removeFromOpenChallenges() {}

realtime.initialize = function (_io) {
  // Save pointer for future reference
  io = _io;

  // Shared session middleware
  io.use(function (socket, next) {
    middlewares.session(socket.request, socket.request.res, next);
  });


  io.on('connection', function (socket) {
    if (socket.request.session.user) {
      var user = socket.request.session.user;

      // Handle connected users status
      users.userConnected(user);
      clearTimeout(disconnectTimeouts[user._id]);
      if (!sockets[user._id]) { sockets[user._id] = []; }
      sockets[user._id].push(socket);

      socket.on('disconnect', function () {
        sockets[user._id] = removeFrom(sockets[user._id], socket);
        if (sockets[user._id].length === 0) { delete sockets[user._id]; }

        disconnectTimeouts[user._id] = setTimeout(function () {
          users.userDisconnected(user);
        }, config.disconnectTimeout);
      });

      // Handle open challenges
      var challengeCheck = socket.handshake.headers.referer.match(new RegExp(config.host + '/web/challenge/([^\/]+)'));
      if (challengeCheck) {
        var challengeId = challengeCheck[1];
        if (!openChallenges[challengeId]) { openChallenges[challengeId] = {}; }
        if (!openChallenges[challengeId][user._id]) { openChallenges[challengeId][user._id] = []; }
        openChallenges[challengeId][user._id].push(socket);

        socket.on('disconnect', function () {
          openChallenges[challengeId][user._id] = removeFrom(openChallenges[challengeId][user._id], socket);
          if (openChallenges[challengeId][user._id].length === 0) { delete openChallenges[challengeId][user._id]; }
          if (Object.keys(openChallenges[challengeId]).length === 0) { delete openChallenges[challengeId]; }
        });
      }
    }
  });
}

realtime.broadcast = function (event, message) {
  io.emit(event, message);
};

// For development
realtime.sockets = sockets;


realtime.getAllOpenChallengesIds = function () {
  return Object.keys(openChallenges);
};

function logOpenChallengesState () {
  console.log('===== OPEN CHALLENGES =====');
  Object.keys(openChallenges).forEach(function (challengeId) {
    console.log('Challenge ' + challengeId);
    Object.keys(openChallenges[challengeId]).forEach(function (userId) {
      console.log('* User ' + userId + ' - ' + openChallenges[challengeId][userId].length + ' sockets')
    });
  });
}




function someLog () {
  console.log("============= Changed sockets per user");
  Object.keys(sockets).forEach(function (_id) {
    console.log(_id + ' - ' + sockets[_id].length + " sockets");
  });
}



// Interface
module.exports = realtime;
