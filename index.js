const Hapi = require('hapi');
const GoodConsole = require('good-console');
const Good = require('good');
const EJS = require('ejs');
const Mongoose = require('mongoose');

var Path = require('path');
var rootPath = '';

function setup( env, __dir ){
  rootPath = Path.normalize(__dir );

  var environment =  {
    port: 6085,
    url: '127.0.0.1',
    mongo: 'http://localhost:12700'
  };

  environment.port = env.PORT || env.NODE_PORT || environment.port;
  environment.url = env.NODE_URL || environment.url;
  environment.mongo = env.MONGODB_URI || environment.mongo;

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
      }
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

  server.views({
    engines: { ejs: EJS },
    path: Path.join(rootPath, 'views')
  });

  return server;
}
function database( config ){

  Mongoose.connect(config.mongo);

  Mongoose.Promise = require('bluebird');

  var db = Mongoose.connection;
  db.on('error', function(){
    console.error('db connection error...');
  });
  db.once('open', function () {
    console.log('db connection opened');
  });
  db.on('connecting', function() {
    console.log('connecting to MongoDB...');
  });
  db.on('connected', function() {
    console.log('MongoDB connected!');
  });
  db.on('reconnected', function () {
    console.log('MongoDB reconnected!');
  });
  db.on('disconnected', function() {
    console.log('MongoDB disconnected!');
    mongoose.connect(dbURI, {server:{auto_reconnect:true}});
  });
}

module.exports = function( env, rootPath ) {
  var config = setup( env, rootPath );
  var server = servidor( config );
  database( config );

  return server;
};