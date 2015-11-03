var listTemplate = $('#listTemplate').html()
  , connectedInitialData = JSON.parse($('#connectedInitialData').html())
  , disconnectedInitialData = JSON.parse($('#disconnectedInitialData').html())
  ;

socket.on('connectedUsers.change', function(m) {
  $('#lists').html(Mustache.render(listTemplate, m));
});

$('#lists').html(Mustache.render(listTemplate, { connectedUsers: connectedInitialData, disconnectedUsers: disconnectedInitialData }));
