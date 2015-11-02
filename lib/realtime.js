/**
 * For now, put all real time management stuff in here, will probably need to better structure this later on
 * The realtime.initialize function is given the io object tied to the express server
 */

var middlewares = require('./middlewares')
  , users = require('./users')
  , config = require('./config')
  , realtime = {}
  , disconnectTimeouts = {}   // Don't count a user as disconnect right after disconnect event as a page refresh fires a disconnect then reconnect event
  , io
  ;

realtime.initialize = function (_io) {
  // Save pointer for future reference
  io = _io;

  // Shared session middleware
  io.use(function (socket, next) {
    middlewares.session(socket.request, socket.request.res, next);
  });


  io.on('connection', function (socket) {
    if (socket.request.session.user) {
      users.userConnected(socket.request.session.user);
      clearTimeout(disconnectTimeouts[socket.request.session.user._id]);
    }

    socket.on('disconnect', function () {
      disconnectTimeouts[socket.request.session.user._id] = setTimeout(function () {
        users.userDisconnected(socket.request.session.user);
      }, config.disconnectTimeout);
    });
  });
}

realtime.broadcast = function (event, message) {
  io.emit(event, message);
};


// Interface
module.exports = realtime;
