var listTemplate = $('#listTemplate').html();

socket.on('connectedUsers.change', function(m) {
  $('#lists').html(Mustache.render(listTemplate, m));
});
