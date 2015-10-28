$(document).ready(function () {
  $('#create-game').on('click', function (evt) {
    evt.preventDefault();
    $('#create-game-modal').modal();
  });

  //$('#create-game-modal .btn-primary').on('click', function (evt) {
    //console.log('RRR');
  //});



  $('#create-game-modal .btn-primary').on('click', function () {
    console.log('Sending data to server');
  });
});
