var listTemplate = $('#listTemplate').html()
  , initialList = $('#listInitialData').html();

socket.on('openChallenges.change', function(m) {
  $('#list').html(Mustache.render(listTemplate, m));
});

$('#list').html(Mustache.render(listTemplate, JSON.parse(initialList)));
