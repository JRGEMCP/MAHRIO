const Hapi = require('@hapi/hapi');
const GoodConsole = require('@hapi/good-console');
const Good = require('@hapi/good');
const BearerToken = require('hapi-auth-bearer-token');
const Bell = require('@hapi/bell');
const CookieSession = require('@hapi/cookie');
const EJS = require('ejs');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const _ = require('lodash');
var Path = require('path');

var rootPath = '';

var database = require('./database/serve');

function setup(input_env, __dir) {
    rootPath = Path.normalize(__dir);

    var environment = {
        port: 6085,
        url: '127.0.0.1',
        mongo: null,
        public: 'public',
        views: 'views'
    }

    environment.port = input_env.PORT || input_env.NODE_PORT || environment.port;
    environment.url = input_env.NODE_URL || environment.url;
    environment.mongo = input_env.MONGODB_URI || environment.mongo;
    environment.userRole = input_env.USER_ROLE || 'anonymous';
    environment.public = input_env.NODE_PUBLIC_PATH || environment.public;
    environment.views = input_env.NODE_VIEWS_PATH || environment.views;
    environment.pages = input_env.WEB_PAGES || false;
    environment.domain = input_env.WEB_DOMAIN || 'http://127.0.0.1:6085';
    environment.forceTls = input_env.NODE_ENV != "development"

    environment.aws = {
        accessKey: input_env.AWS_ACCESS_KEY || null,
        secretKey: input_env.AWS_SECRET_KEY || null,
        s3: input_env.AWS_S3_BUCKET || null
      };

    if( input_env.GIT_ID && input_env.GIT_SECRET ) {
        environment.git = {
            id: input_env.GIT_ID,
            secret: input_env.GIT_SECRET
        };
    }
    if( input_env.MAILGUN_API_KEY && input_env.MAILGUN_DOMAIN && input_env.MAILGUN_FROM ) {
        environment.mailgun = {
            key: input_env.MAILGUN_API_KEY,
            domain: input_env.MAILGUN_DOMAIN,
            from: input_env.MAILGUN_FROM
        }
    }

    if( input_env.NODE_ENV === 'production'){
        delete environment.url;
    }
    
    return environment;
}

var servidor = function( input_config) {
    
    var serverConfigTemplate = {
        port: input_config.port,
        routes: {
            files: {            
                relativeTo: Path.join(rootPath, input_config.public)
            },
            log: { collect: true }
        }
    }

    if (input_config.url) {
        serverConfigTemplate.host = input_config.url
    }

    const server = new Hapi.Server(serverConfigTemplate);

    server.register({
        plugin: Good,
        options: {
          reporters: {
            mahrioConsoleReporter: [{
                module: "@hapi/good-squeeze",
                name: 'Squeeze',
                args: [{ log: '*', response: '*' }]
              }, { module: '@hapi/good-console'
            }, 'stdout']
          }
        }
      }).then((err) => {
        if (err) {
          throw err;
        }
        server.start()
        console.log('Server running at:', server.info.uri);

    })
    

    var logError = function (err) { if (err) { console.error(err); }};

    async function register_bearer() {
      await server.register(BearerToken)
    }

    register_bearer();

    async function register_cookie() {
      await server.register(CookieSession)
    }

    register_cookie();

    async function register_bell() {
      await server.register(Bell)
    }

    if( input_config.git ) {
      register_bell();
  
      server.auth.strategy('github', 'bell', {
        provider: 'github',
        password: 'cookie_encryption_password_with_bell',
        clientId: input_config.git.id,
        clientSecret: input_config.git.secret,
        isSecure: false,
        scope: ['public_repo','admin:org']

      });
    }

    if( input_config.mailgun ){
        server.mailer = (function(fromWho){
          var Mailgun = require('mailgun-js');
          var mail = new Mailgun({apiKey: input_config.mailgun.key, domain: input_config.mailgun.domain });
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
        })(input_config.mailgun.from);
        server.hostDomain = input_config.domain;
      }

    server.mahr = input_config;

    server.register(Inert);

    async function register_vision () {  
      await server.register(Vision)

      server.views({
        engines: { ejs: EJS },
        path: Path.join(rootPath, input_config.views)
      })
    }

    register_vision()

    server.userRole = input_config.userRole;

    server.ext('onRequest', function(request, h) {
        var redirect = request.headers['x-forwarded-proto'] === 'http' && server.mahr.forceTls;
        if( redirect ){
          return h.redirect("https://"+request.headers.host+request.url.path).code(301).takeover()
        }
        return h.continue;
    })

    return server;
}

module.exports =  {
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
          });
        });
      } else {
        return new Promise(function (resolve) {
          resolve(server);
        });
      }
    }
  };
  