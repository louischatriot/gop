var listTemplate = $('#listTemplate').html()
  , initialData = JSON.parse($('#listInitialData').html())
  ;

socket.on('games.change', function(m) {
  console.log('------------');
  console.log(m);
  $('#list').html(Mustache.render(listTemplate, m));
});

$('#list').html(Mustache.render(listTemplate, initialData));

