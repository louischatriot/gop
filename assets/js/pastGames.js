var listTemplate = ''
  , data = JSON.parse($('#listInitialData').html())
  , $ghostLink = $('<a href="http://google.fr" target="_blank" id="ghost-link" style="display: none;">Ghost link</a>')
  , ctrlDown = false;
  ;

$('body').append($ghostLink);

listTemplate += '{{#pastGames.length}}<table class="table table-hover"><thead><th class="span4">Players (black vs white)</th><th class="span1">Board size</th><th class="span4">Name</th><th class="span3">Result</th></thead><tbody>{{/pastGames.length}}'
listTemplate += '{{#pastGames.length}}{{#pastGames}} <tr href="/web/game/{{_id}}">'
  listTemplate += '<td>{{blackPlayerName}} vs {{whitePlayerName}}</td>'
  listTemplate += '<td>{{size}}x{{size}}</td>'
  listTemplate += '<td>{{name}}</td>'
  listTemplate += '<td>{{resultExpanded}}</td>'
listTemplate += '</tr>{{/pastGames}}{{/pastGames.length}}'
listTemplate += '{{#pastGames.length}}</tbody></table>{{/pastGames.length}}'
listTemplate += '{{^pastGames.length}}No past game{{/pastGames.length}}'

function updateList() {
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


// This UX is of course not perfect but good enough and no need to to a full database count
$('#load-more').on('click', function () {
  var earliestGameTime = (new Date(data.pastGames[data.pastGames.length - 1].createdAt)).getTime();
  $.ajax({ type: 'GET', url: '/api/past-games?before=' + earliestGameTime }).complete(function (jqxhr) {
    data.pastGames = data.pastGames.concat(jqxhr.responseJSON.pastGames);
    updateList();

    if (jqxhr.responseJSON.noMore) {
      $('#load-more').prop('disabled', 'true').html("All past games loaded");
    }
  });
});



// No real time changing for this one, but a "display more" button
updateList();

