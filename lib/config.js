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
    config.loginNotRequired = true;   // Set to true to avoid having to log upon every reload
    config.host = 'http://localhost:5000';
    break;
}

// Interface
module.exports = config;
