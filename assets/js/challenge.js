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

var interval = 3000;

function changeQuote () {
  $('#waiting-banner .quote').html(quotes[Math.floor(Math.random() * quotes.length)]);
}

setInterval(changeQuote, interval);
changeQuote();
