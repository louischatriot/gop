var env = process.env.GOP_ENV || 'dev'
  , config = {}
  ;

// Common options
config.env = env;
config.serverPort = 5000;
config.disconnectTimeout = 2000;   // In ms
config.staleGameCleanupDelay = 3000;   // DEV //24 * 60 * 60 * 1000;   // In ms

// Environment specific options
switch (env) {
  case 'prod':
    config.host = 'http://lmt.io';
    break;

  case 'dev':
  default:
    config.loginNotRequired = false;   // Set to true to avoid having to log upon every reload
    config.host = 'http://localhost:5000';
    break;
}

// Interface
module.exports = config;
