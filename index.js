var Path = require('path'),
  rootPath = Path.normalize(__dirname + '/../../');

'use strict';

const Hapi = require('hapi');
const Path = require('path');
const GoodConsole = require('good-console');
const Good = require('good');
const EJS = require('ejs');
const Mongoose = require('mongoose');

function setup( env ){
  console.log('got setup');

  // Define default parameters and allow extending
  var environment =  {
    port: 8080,
    url: 'localhost',
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
function server( config ){
  console.log('got server');

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
  console.log('got database');

  Mongoose.connect(config.mongo);

  Mongoose.Promise = require('bluebird');

  var db = Mongoose.connection;
  db.on('error', function(){
    console.error('db connection error...');
  });
  db.once('open', function () {
    console.log('db connection opened');
  });
}

module.exports = function( env ) {
  var config = setup( env );
  var server = server( config );
  database( config );

  return server;
};