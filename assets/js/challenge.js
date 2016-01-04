var challenge = JSON.parse($('#challenge').html())
  , user = JSON.parse($('#user').html())
  ;


// DEV
//challenge.challengers = [{ _id: 'id1', name: 'LCLC' }, { _id: 'id2', name: 'JCJC' }];

//challenge.currentChallenger = { _id: 'id2' };


socket.on('challenger.connected', function (m) {
  document.location = '/web/game/' + challenge._id;
});



/**
 * Update visual representation of global data variable
 */
var screens = { WAITING: '#waiting-banner-screen', NEGOTIATION: '#negotiation-screen' };

function updateScreen () {
  var screenId = challenge && challenge.challengers ? screens.NEGOTIATION : screens.WAITING
    , template = $(screenId).html()
    , data = { challenge: challenge, user: user }
    ;

  // Really ugly but it seems that Jade is forcing my hand here
  // TODO: find out why Jade supposedly plain text parts are not plain text
  // TODO: CHANGE MUSTACHE DELIMITERS
  template = template.replace(/&#47;/g, '/');
  template = template.replace(/&lt;/g, '<');
  template = template.replace(/&gt;/g, '>');

  data.iAmCreator = user._id === challenge.creatorId;
  data.iAmChallenger = challenge.currentChallenger && user._id === challenge.currentChallenger._id;
  data.canModifyHandicap = data.iAmCreator || data.iAmChallenger;

  if (challenge.challengers && challenge.currentChallenger) {
    data.challenge.challengers.forEach(function (d) {
      if (d._id === challenge.currentChallenger._id) {
        d.selected = true;
      }
    });
  }

  var contents = Mustache.render(template, data);
  $('#current-screen').html(contents);
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

