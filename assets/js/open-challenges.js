var listTemplate = $('#listTemplate').html();

socket.on('openChallenges.change', function(m) {

  console.log(m);

  console.log(Mustache.render(listTemplate, m));
  $('#list').html(Mustache.render(listTemplate, m));
});

