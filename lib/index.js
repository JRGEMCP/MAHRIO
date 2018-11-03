const Hapi = require('hapi');
const GoodConsole = require('good-console');
const Good = require('good');
const BearerToken = require('hapi-auth-bearer-token');
const Bell = require('bell');
const CookieSession = require('hapi-auth-cookie');
const EJS = require('ejs');
const Inert = require('inert');
const Vision = require('vision');
const _ = require('lodash');

var Path = require('path');
var rootPath = '';
var database = require('./database/serve');

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
  environment.views = env.NODE_VIEWS_PATH || environment.views;
  environment.pages = env.WEB_PAGES || false;
  environment.domain = env.WEB_DOMAIN || 'http://127.0.0.1:6085';
  environment.forceTls = env.NODE_ENV != "development"

  environment.aws = {
    accessKey: env.AWS_ACCESS_KEY || null,
    secretKey: env.AWS_SECRET_KEY || null,
    s3: env.AWS_S3_BUCKET || null
  };

  if( env.GIT_ID && env.GIT_SECRET ) {
    environment.git = {
      id: env.GIT_ID,
      secret: env.GIT_SECRET
    };
  }
  if( env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN && env.MAILGUN_FROM ) {
    environment.mailgun = {
      key: env.MAILGUN_API_KEY,
      domain: env.MAILGUN_DOMAIN,
      from: env.MAILGUN_FROM
    }
  }

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
        relativeTo: Path.join(rootPath, config.public)
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
      reporters: {
        mahrioConsoleReporter: [{
            module: "good-squeeze",
            name: 'Squeeze',
            args: [{ log: '*', response: '*' }]
          }, { module: 'good-console'
        }, 'stdout']
      }
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
  if( config.git ) {
    server.register(Bell, function (err) {
      if (err) { console.error(err); }

      server.auth.strategy('github', 'bell', {
        provider: 'github',
        password: 'cookie_encryption_password_with_bell',
        clientId: config.git.id,
        clientSecret: config.git.secret,
        isSecure: false,
        scope: ['public_repo','admin:org']
      });
    });
  }
  server.mahr = config;
  if( config.mailgun ){
    server.mailer = (function(fromWho){
      var Mailgun = require('mailgun-js');
      var mail = new Mailgun({apiKey: config.mailgun.key, domain: config.mailgun.domain });
      return function( mailObj ) {
        var data = {
          from: fromWho,
          to: mailObj.to,
          subject: mailObj.subject,
          html: mailObj.html
        };
        if( data.from ) {
          //Invokes the method to send emails given the above data with the helper library
          mail.messages().send(data, function (err, body) {
            //If there is an error, render the error page
            if (err) {
              console.log('got an error: ', err);
            } else {
              console.log(body);
            }
          });
        }
      };
    })(config.mailgun.from);
    server.hostDomain = config.domain;
  }

  server.register(Vision);
  server.register(Inert);
  server.views({
    engines: { ejs: EJS },
    path: Path.join(rootPath, config.views)
  });

  server.userRole = config.userRole;

  server.ext('onRequest', function(request, reply) {
    var redirect = request.headers['x-forwarded-proto'] === 'http' && server.mahr.forceTls;
    if( redirect ){
      return reply().redirect("https://"+request.headers.host+request.url.path).code(301)
    }
    return reply.continue();
  });

  return server;
};


module.exports = {
  seedDatabase: function( env, rootPath, site){
    var config = setup(env, rootPath);
    var populate = require('./database/populate');
    populate( config, site);
  },
  runServer: function( env, rootPath ) {
    var config = setup(env, rootPath);
    var server = servidor(config);

    if (config.mongo) {
      console.log('MongoDB Config...')
      return new Promise(function (resolve, reject) {
        database(config).then(function (data) {
          if( data ){
            server.menu = data[1];
            server.pages = _.keyBy(data[0], 'url');
          }
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
