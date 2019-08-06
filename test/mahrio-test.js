process.env.NODE_ENV = 'test';
let chai = require('chai');
chai.should();

let mahrio = require('../lib/index.js');

describe('Mahrio', () => {
  it('should have a runServer function that returns a promise', () => {
    return mahrio.runServer( process.env, __dirname, function (server) {

      server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
          directory: {
            path: ['../public/']
          }
        }
      });
    }).then(function(mahrio_server) {
      mahrio_server.info.host.should.equal('127.0.0.1');
      mahrio_server.info.port.should.equal(6085);
    });
  });
});
