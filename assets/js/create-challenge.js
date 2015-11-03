$(document).ready(function () {
  $('#create-game').on('click', function (evt) {
    evt.preventDefault();
    $('#create-game-modal').modal();
  });

  $('#create-game-modal .btn-primary').on('click', function () {
    $.ajax({ url: '/api/create-challenge' }).complete(function (jqxhr) {
      if (jqxhr.status === 500) {
        // TODO: explain error
        return;
      }

      if (jqxhr.status === 200) {
        document.location = jqxhr.responseJSON.redirectUrl;
      }
    });
  });
});
