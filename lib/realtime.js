/**
 * For now, put all real time management stuff in here, will probably need to better structure this later on
 * The realtime.initialize function is given the io object tied to the express server
 */

var middlewares = require('./middlewares')
  , users = require('./users')
  , realtime = {}
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
    }

    socket.on('disconnect', function () {
      users.userDisconnected(socket.request.session.user);
    });
  });
}

realtime.broadcast = function (event, message) {
  io.emit(event, message);
};


// Interface
module.exports = realtime;
