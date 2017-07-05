const Hapi = require('hapi');
const GoodConsole = require('good-console');
const Good = require('good');
const BearerToken = require('hapi-auth-bearer-token');
const CookieSession = require('hapi-auth-cookie');
const EJS = require('ejs');
const Inert = require('inert');
const Vision = require('vision');
const _ = require('lodash');

var Path = require('path');
var rootPath = '';
var database = require('./database/serve');
var populate = require('./database/populate');

function setup( env, __dir ){
  rootPath = Path.normalize(__dir );

  var environment =  {
    port: 6085,
    url: '127.0.0.1',
    mongo: null,
    public: 'public',
    views: 'views'
  };

  environment.port = env.PORT || env.NODE_PORT || environment.port;
  environment.url = env.NODE_URL || environment.url;
  environment.mongo = env.MONGODB_URI || environment.mongo;
  environment.userRole = env.USER_ROLE || 'anonymous';
  environment.public = env.NODE_PUBLIC_PATH || environment.public;
  environment.views = env.view_path || environment.views;

  if( env.NODE_ENV === 'production'){
    delete environment.url;
  }

  return environment;
}
var servidor = function( config ){
  const server = new Hapi.Server();

  var serverConfig = {
    port: config.port,
    routes: {
      files: {
        relativeTo: Path.join(rootPath, 'public')
      },
      log: true
    }
  };

  if( config.url ) {
    serverConfig.host = config.url;
  }

  server.connection( serverConfig );

  server.register({
    register: Good,
    options: {
      reporters: [{
        reporter: GoodConsole,
        events: {
          response: '*',
          log: '*'
        }
      }]
    }
  }, function(err) {
    if (err) {
      throw err; // something bad happened loading the plugin
    }

    server.start(function(err) {
      if (err) {
        throw err;
      }
      console.log('Server running at:', server.info.uri);
    });
  });

  var logError = function (err) { if (err) { console.error(err); }};
  server.register(BearerToken, logError);
  server.register(CookieSession, logError);

  server.register(Vision);
  server.register(Inert);
  server.views({
    engines: { ejs: EJS },
    path: Path.join(rootPath, environment.views)
  });

  server.userRole = config.userRole;

  return server;
}


module.exports = {
  seedDatabase: function( env, rootPath, site){
    var config = setup(env, rootPath);
    populate( config, site);
  },
  runServer: function( env, rootPath ) {
    var config = setup(env, rootPath);
    var server = servidor(config);

    if (config.mongo) {
      console.log('have mongo')
      return new Promise(function (resolve, reject) {
        database(config).then(function (data) {
          server.menu = data[1];
          console.log('WAITING');
          server.pages = _.keyBy(data[0], 'url');
          resolve(server);
        }).catch(function () {
          console.log('EXITING');
          resolve(server);
          //process.exit(0);
        });
      });
    } else {
      return new Promise(function (resolve) {
        resolve(server);
      });
    }
  }
};