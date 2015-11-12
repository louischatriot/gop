var Nedb = require('nedb')
  , db = {}
  ;

/*
 * User schema
 * * _id
 * * email
 * * name
 * * dateCreated
 */

db.users = new Nedb({ filename: './data/users.nedb', autoload: true, timestampData: true });
db.users.ensureIndex({ fieldName: 'email', unique: true });


/*
 * Challenge schema
 * * _id
 * * creatorId
 * * creatorName - let's avoid some N+1 selects
 * * dateCreated
 * * name[5 <= length <= 25]
 * * size[9|13|19]
 *
 */
db.challenges = new Nedb({ filename: './data/challenges.nedb', autoload: true, timestampData: true })


/*
 * Game schema
 * * _id
 * * blackPlayerId
 * * blackPlayerName
 * * whitePlayerId
 * * whitePlayerName
 * * name[5 <= length <= 25]
 * * size[9|13|19]
 * * moves
 * * currentMoveNumber
 * * status[ONGOING|FINISHED]
 * * result[undefined|DRAW|BLACK_WIN|WHITE_WIN]
 * * resultExpanded - "White wins by 7.5", "White resigned on move 142" etc.
 */
db.games = new Nedb({ filename: './data/games.nedb', autoload: true, timestampData: true })
db.games.statuses = { ONGOING: 'ongoing', FINISHED: 'finished' };


// Interface
module.exports = db;
