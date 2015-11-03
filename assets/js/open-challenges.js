var listTemplate = $('#listTemplate').html();

socket.on('openChallenges.change', function(m) {
  $('#list').html(Mustache.render(listTemplate, m));
});

