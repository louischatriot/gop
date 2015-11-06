var listTemplate = ''
  , initialData = JSON.parse($('#listInitialData').html())
  ;

listTemplate += '{{^empty}}<table class="table table-hover"><thead><th>Creator</th><th>Board size</th><th>Name</th></thead><tbody>{{/empty}}'
listTemplate += '{{^empty}}{{#openChallenges}} <tr href="/web/game/{{_id}}"><td>{{creatorName}}</td>  <td>{{size}}x{{size}}</td>  <td>{{name}}</td></tr> {{/openChallenges}}{{/empty}}'
listTemplate += '{{^empty}}</tbody></table>{{/empty}}'
listTemplate += '{{#empty}}No open challenge{{/empty}}'

function updateList(data) {
  data.empty = data.openChallenges.length === 0;
  $('#list').html(Mustache.render(listTemplate, data));

  $('tbody tr').css('cursor', 'pointer');

  $('tr').on('mousedown', function (evt) {
    var url = $(evt.currentTarget).attr('href');
    if (evt.which === 1) { document.location = url; }
    if (evt.which === 2) { document.location = url; }   // TODO: find way to open in new tab, maybe creating a transient link and simulating middle click
  });
}


socket.on('openChallenges.change', updateList);
updateList(initialData);
