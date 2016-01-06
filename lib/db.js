var Nedb = require('nedb')
  , db = {}
  ;

/**
 * User schema
 * * _id
 * * email
 * * name
 * * dateCreated
 */

db.users = new Nedb({ filename: './data/users.nedb', autoload: true, timestampData: true });
db.users.ensureIndex({ fieldName: 'email', unique: true });


/**
 * Challenge schema
 * * _id
 * * creatorId
 * * creatorName - let's avoid some N+1 selects
 * * dateCreated
 * * name[5 <= length <= 25]
 * * size[9|13|19]
 * * handicap[2-9]
 * * challengers - [{ _id, name }]
 * * currentChallengerId
 * * creatorOK
 * * currentChallengerOK
 * * creatorColor[black|white]
 */
db.challenges = new Nedb({ filename: './data/challenges.nedb', autoload: true, timestampData: true })


/**
 * Game schema
 * * _id
 * * blackPlayerId
 * * blackPlayerName
 * * whitePlayerId
 * * whitePlayerName
 * * name[2 <= length <= 25]
 * * size[9|13|19]
 * * moves
 * * currentMoveNumber
 * * status[ONGOING|FINISHED|STALE]
 * * deads - Set when game reaches double pass and both players agree on deads
 * * result[undefined|DRAW|BLACK_WIN|WHITE_WIN]
 * * resultExpanded - "White wins by 7.5", "White resigned on move 142" etc.
 */
db.games = new Nedb({ filename: './data/games.nedb', autoload: true, timestampData: true })
db.games.statuses = { ONGOING: 'ongoing', FINISHED: 'finished', STALE: 'stale' };
db.games.results = { DRAW: 'draw', BLACK_WIN: 'black win', WHITE_WIN: 'white win' };
db.games.ensureIndex({ fieldName: 'blackPlayerId' });
db.games.ensureIndex({ fieldName: 'whitePlayerId' });
db.games.ensureIndex({ fieldName: 'status' });


/**
 * Review schema
 * * _id
 * * blackPlayerName
 * * whitePlayerName
 * * gameName
 * * reviewerId - current reviewer, he can give control to another
 * * reviewerName
 * * size[9|13|19]
 * * moves
 * * currentMoveNumber
 * * gameId
 */
db.reviews = new Nedb({ filename: './data/reviews.nedb', autoload: true, timestampData: true });
db.reviews.ensureIndex({ fieldName: 'gameId' });



// Interface
module.exports = db;
