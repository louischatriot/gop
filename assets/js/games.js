var listTemplate = ''
  , initialData = JSON.parse($('#listInitialData').html())
  , $ghostLink = $('<a href="http://google.fr" target="_blank" id="ghost-link" style="display: none;">Ghost link</a>')
  , ctrlDown = false;
  ;

$('body').append($ghostLink);

listTemplate += '<div><b>Game being played</b></div>'
listTemplate += '{{^currentGamesEmpty}}<table class="table table-hover"><thead><th>Players (black vs white)</th><th>Board size</th><th>Name</th></thead><tbody>{{/currentGamesEmpty}}'
listTemplate += '{{^currentGamesEmpty}}{{#currentGames}} <tr href="/web/game/{{_id}}">'
  listTemplate += '<td>{{blackPlayerName}} vs {{whitePlayerName}}</td>'
  listTemplate += '<td>{{size}}x{{size}}</td>'
  listTemplate += '<td>{{name}}</td>'
listTemplate += '{{/currentGames}}{{/currentGamesEmpty}}'
listTemplate += '{{^currentGamesEmpty}}</tbody></table>{{/currentGamesEmpty}}'
listTemplate += '{{#currentGamesEmpty}}No current game{{/currentGamesEmpty}}'

listTemplate += '<br><br>'

listTemplate += '<div><b>Past games</b></div>'
listTemplate += '{{^pastGamesEmpty}}<table class="table table-hover"><thead><th>Players (black vs white)</th><th>Board size</th><th>Name</th></thead><tbody>{{/pastGamesEmpty}}'
listTemplate += '{{^pastGamesEmpty}}{{#pastGames}} <tr href="/web/game/{{_id}}">'
  listTemplate += '<td>{{blackPlayerName}} vs {{whitePlayerName}}</td>'
  listTemplate += '<td>{{size}}x{{size}}</td>'
  listTemplate += '<td>{{name}}</td>'
listTemplate += '{{/pastGames}}{{/pastGamesEmpty}}'
listTemplate += '{{^pastGamesEmpty}}</tbody></table>{{/pastGamesEmpty}}'
listTemplate += '{{#pastGamesEmpty}}No past game{{/pastGamesEmpty}}'

function updateList(data) {
  data.currentGamesEmpty = data.currentGames.length === 0;
  data.pastGamesEmpty = data.pastGames.length === 0;
  $('#list').html(Mustache.render(listTemplate, data));

  $('tbody tr').css('cursor', 'pointer');

  // Super convoluted, but only way to mimic mouse actions behavior
  $('tr').on('mousedown', function (evt) {
    var url = $(evt.currentTarget).attr('href');
    if (evt.which === 1) {
      if (ctrlDown) {
        openInNewTab(url);
        ctrlDown = false;
      } else {
        openInCurrentTab(url);
      }
    }
    if (evt.which === 2) { openInNewTab(url); }
  });
}

$(document).on('keydown', function (evt) {
  if (evt.keyCode === 17) { ctrlDown = true; }
});

$(document).on('keyup', function (evt) {
  if (evt.keyCode === 17) { ctrlDown = false; }
});

function openInCurrentTab (url) {
  document.location = url;
}

function openInNewTab (url) {
  $ghostLink.attr('href', url);
  $ghostLink[0].click();
}



socket.on('games.change', updateList);
updateList(initialData);

