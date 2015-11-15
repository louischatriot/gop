var listTemplate = ''
  , initialData = JSON.parse($('#listInitialData').html())
  , $ghostLink = $('<a href="http://google.fr" id="ghost-link" style="display: none;">Ghost link</a>')
  , ctrlDown = false;
  ;

$('body').append($ghostLink);

listTemplate += '{{^empty}}<table class="table table-hover"><thead><th>Creator</th><th>Board size</th><th>Name</th></thead><tbody>{{/empty}}'
listTemplate += '{{^empty}}{{#openChallenges}} <tr href="/web/game/{{_id}}">'
  listTemplate += '<td>{{creatorName}}</td>'
  listTemplate += '<td>{{size}}x{{size}}</td>'
  listTemplate += '<td>{{name}}</td>'
listTemplate += '{{/openChallenges}}{{/empty}}'
listTemplate += '{{^empty}}</tbody></table>{{/empty}}'
listTemplate += '{{#empty}}No open challenge{{/empty}}'

function updateList(data) {
  data.empty = data.openChallenges.length === 0;
  $('#list').html(Mustache.render(listTemplate, data));

  $('tbody tr').css('cursor', 'pointer');

  // Super convoluted, but only way to mimic mouse actions behavior
  $('tr').on('mousedown', function (evt) {
    var url = $(evt.currentTarget).attr('href');
    if (!url) { return; }

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




socket.on('openChallenges.change', updateList);
updateList(initialData);
