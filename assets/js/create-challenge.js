// TODO: handle validation on each form data change
function createChallenge () {
  // Get and validate the data
  var data = {};
  data.name = $('#input-name').val()
  data.size = parseInt($('#input-size option:selected').val(), 10)

  if (data.name.length <= 1 || data.name.length > 25) {
    $('#input-name').parent().parent().addClass('error');
    $('#input-name').parent().find('span.help-inline').html('Game name must be between 2 and 25 characters');
    return;
  } else {
    $('#input-name').parent().parent().removeClass('error');
    $('#input-name').parent().find('span.help-inline').html('');
  }

  $.ajax({ type: 'POST', url: '/api/create-challenge', data: data, dataType: 'json' }).complete(function (jqxhr) {
    if (jqxhr.status === 500) {
      // TODO: explain error
      return;
    }

    if (jqxhr.status === 200) {
      document.location = jqxhr.responseJSON.redirectUrl;
    }
  });
}


$(document).ready(function () {
  $('#create-game').on('click', function (evt) {
    evt.preventDefault();
    $('#create-game-modal').modal();
  });

  $('#create-game-modal .btn-primary').on('click', createChallenge);
  $('#create-game-modal').on('keypress', function (evt) {
    if (evt.keyCode === 13) {
      evt.preventDefault();
      createChallenge();
    }
  });
});
