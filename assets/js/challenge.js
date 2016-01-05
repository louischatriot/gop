var challenge = JSON.parse($('#challenge').html())
  , user = JSON.parse($('#user').html())
  ;


// DEV
challenge.challengers = [{ _id: 'id1', name: 'LCLC' }, { _id: 'id2', name: 'JCJC' }];

challenge.currentChallengerId = 'id2';


/**
 * Update current screen when challenge was modified on server
 * TODO: check there as an actual change to reactivate accept button
 */
socket.on('challenge.' + challenge._id + '.modified', function (m) {
  console.log('-----------------------');
  console.log(m);
  challenge = m.challenge;
  updateScreen();
});

socket.on('challenge.' + challenge._id + '.canceled', function (m) {
  challenge = null;
  updateScreen();
});


/**
 * Current user status
 */
function isCreator () { return challenge && user._id === challenge.creatorId; }
function isCurrentChallenger () { return challenge && user._id === challenge.currentChallengerId; }


/**
 * Notify server of changes to the challenge
 * @param {Event} evt The click event triggered on the accept button
 */
function notifyServer (evt) {
  var data = {};

  if (isCreator()) {
    data.challengerId = $(evt.currentTarget).parent().find('#challenger').val();
  }

  if (isCreator() || isCurrentChallenger()) {
    data.handicap = parseInt($(evt.currentTarget).parent().find('#handicap').val(), 10);
  }

  $.ajax({ type: 'PUT', url: '/api/challenge/' + challenge._id
         , dataType: 'json', contentType: "application/json; charset=utf-8"
         , data: JSON.stringify(data)
         });
}


/**
 * Update visual representation of global data variable
 */
var screens = { WAITING: '#waiting-banner-screen', NEGOTIATION: '#negotiation-screen', CANCELED: '#challenge-canceled' };

function updateScreen () {
  var screenId = challenge && challenge.challengers && challenge.challengers.length > 0 ? screens.NEGOTIATION : screens.WAITING
  if (!challenge) { screenId = screens.CANCELED; }
  var template = $(screenId).html()
    , data = { challenge: challenge, user: user };

  // To ensure that innerHTML doesn't modify the Mustache templates we need to encapsulate them in HTML comments
  template = template.replace(/<!--/, '');
  template = template.replace(/-->/g, '');

  data.iAmCreator = isCreator();
  data.canModifyHandicap = isCreator() || isCurrentChallenger();

  if (challenge && challenge.challengers && challenge.currentChallengerId) {
    data.challenge.challengers.forEach(function (d) {
      if (d._id === challenge.currentChallengerId) {
        d.selected = true;
      }
    });
  }


  var contents = Mustache.render(template, data);
  $('#current-screen').html(contents);

  // Reattach event listeners and populate values
  $('#current-screen #accept-terms').on('click', notifyServer);

  if (challenge && challenge.handicap !== undefined) {
    $('#current-screen #handicap option[value=' + challenge.handicap + ']').attr('selected', true);
  }
}


/**
 * Regularly update banner contents
 * Independent from the rest of the application, no need to handle stop and starts
 */
var quotes = [
  "White wins"
, "Never try to smoke a bamboo joint"
, "Cut first, think later"
, "Tenuki before you forget"
, "If throwing in doesn't work, try throwing up"
, "Since everything works in Theory, let's move there"
, "A stone on the board is worth two in the bowl"
, "When in doubt, tenuki"
, "Let him that is without gote place the first stone"
, "Strange things happen in byo-yomi"
, "Cut first, ask questions later"
, "Don't cut without thinking. Think first, then cut anyway"
, "Having two large groups is better than having one small group"
, "Peep first, ask questions later"
, "Seen from a sufficient distance, the black and white stones of any go game form their own unique shade of grey"
, "If you obey no proverbs then resign. If you obey all proverbs then resign"
, "All Go Proverbs lie. - Godel"
, "Your opponent's best move is the one you overlooked"
, "There is damezumari in the 1-1 point"
, "Resigning is gote, and should never be played"
];

var interval = 4000;

function changeQuote () {
  $('#waiting-banner .quote').html(quotes[Math.floor(Math.random() * quotes.length)]);
}

setInterval(changeQuote, interval);
changeQuote();


/**
 * INITIALIZATION
 */
updateScreen();

