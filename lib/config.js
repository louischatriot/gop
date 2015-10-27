var env = process.env.GOP_ENV || 'dev'
  , config = {}
  ;

// Common options
config.env = env;
config.serverPort = 5000;

// Environment specific options
switch (env) {
  case 'prod':
    config.host = 'TBD';
    break;

  case 'dev':
  default:
    config.host = 'http://localhost:5000';
    break;
}

// Interface
module.exports = config;
