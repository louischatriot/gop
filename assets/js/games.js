var listTemplate = ''
  , initialData = JSON.parse($('#listInitialData').html())
  , $ghostLink = $('<a href="http://google.fr" target="_blank" id="ghost-link" style="display: none;">Ghost link</a>')
  , ctrlDown = false;
  ;

$('body').append($ghostLink);

listTemplate += '<div><b>Games being played</b></div>'
listTemplate += '{{#currentGames.length}}<table class="table table-hover"><thead><th>Players (black vs white)</th><th>Type</th><th>Name</th></thead><tbody>{{/currentGames.length}}'
listTemplate += '{{#currentGames.length}}{{#currentGames}} <tr href="/web/game/{{_id}}">'
  listTemplate += '<td>{{blackPlayerName}} vs {{whitePlayerName}}</td>'
  listTemplate += '<td>{{size}}x{{size}} {{#handicap}}H{{handicap}}{{/handicap}}</td>'
  listTemplate += '<td>{{name}}</td>'
listTemplate += '</tr>{{/currentGames}}{{/currentGames.length}}'
listTemplate += '{{#currentGames.length}}</tbody></table>{{/currentGames.length}}'
listTemplate += '{{^currentGames.length}}No current game<br><br>{{/currentGames.length}}'

listTemplate += '<div><b>Stale games</b> <i class="icon-question-sign" id="stale-explanation" style="cursor: pointer;"></i></div>'
listTemplate += '{{#staleGames.length}}<table class="table table-hover"><thead><th>Players (black vs white)</th><th>Type</th><th>Name</th></thead><tbody>{{/staleGames.length}}'
listTemplate += '{{#staleGames.length}}{{#staleGames}} <tr href="/web/game/{{_id}}">'
  listTemplate += '<td>{{blackPlayerName}} vs {{whitePlayerName}}</td>'
  listTemplate += '<td>{{size}}x{{size}} {{#handicap}}H{{handicap}}{{/handicap}}</td>'
  listTemplate += '<td>{{name}}</td>'
listTemplate += '</tr>{{/staleGames}}{{/staleGames.length}}'
listTemplate += '{{#staleGames.length}}</tbody></table>{{/staleGames.length}}'
listTemplate += '{{^staleGames.length}}No stale game<br><br>{{/staleGames.length}}'


function updateList(data) {
  $('#list').html(Mustache.render(listTemplate, data));

  $('tbody tr').css('cursor', 'pointer');

  // Super convoluted, but only way to mimic mouse actions behavior
  $('tr').on('mousedown', function (evt) {
    var url = $(evt.currentTarget).attr('href');
    if (!url || url.length === 0) { return; }
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


$(document).ready(function () {
  $('#stale-explanation').tooltip({ title: 'Stale games are unfinished games where both players have left. They are automatically finished as draw after 10 minutes.' });
});

socket.on('games.change', updateList);
updateList(initialData);

