/*
 * User schema
 * * _id
 * * email
 * * name
 * * dateCreated
 */

var Nedb = require('nedb')
  , users = new Nedb({ filename: './data/users.nedb', autoload: true })
  ;

users.ensureIndex({ fieldName: 'email', unique: true });

/**
 * cb(err, user)
 */
function getUserFromEmail (email, cb) {
  users.find({ email: email }, function (err, res) {
    if (err) { return cb(err); }

    if (res.length === 1) {
      return cb(null, res[0]);
    } else {
      return cb(null, null);
    }
  });
}

/**
 * cb(err, newUser)
 */
function createUser(opts, cb) {
  if (!opts.email) { return cb({ fieldMissing: 'email' }); }
  if (!opts.name) { return cb({ fieldMissing: 'name' }); }

  var user = { email: opts.email, name: opts.name, dateCreated: new Date() };
  users.insert(user, function (err, newUser) { return cb(err, newUser); });   // Coerce signature
}



// Interface
module.exports.getUserFromEmail = getUserFromEmail;
module.exports.createUser = createUser;


