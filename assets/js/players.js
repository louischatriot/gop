console.log(socket);


socket.on('connectedUsers.change', function(m) {
  //TODO: Switch to a template-based approach
  var lists = "<b>Connected users</b><ul>";
  m.connectedUsers.forEach(function (user) {
    lists += "<li>" + user.name + " - " + user.email + "</li>";
  });
  lists += "</ul><b>Disconnected users</b><ul>";
  m.disconnectedUsers.forEach(function (user) {
    lists += "<li>" + user.name + " - " + user.email + "</li>";
  });
  lists += "</ul>";

  $('#lists').html(lists);
});
