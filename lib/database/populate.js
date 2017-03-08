const Mongoose = require('mongoose');

require('./models/page');
require('./models/menu');
require('./models/section');

var Page = Mongoose.model('Page')
  , Section = Mongoose.model('PageSection')
  , Menu = Mongoose.model('PageMenu');

module.exports = function( config, site ){
  Mongoose.connect(config.mongo);

  Mongoose.Promise = require('bluebird');

  var db = Mongoose.connection;

  db.on('connecting', function() {
    console.log('connecting to MongoDB...');
  });

  db.once('open', function () {
    console.log('db connection opened... begin seed');

  });

  db.on('connected', function() {
    console.log('MongoDB connected!');
    for( var key in site ) {
      Menu.create({ key: key, content: site[key]} );
    }
  });
  db.on('reconnected', function () {
    console.log('MongoDB reconnected!');
  });

  db.on('error', function(){
    console.error('db connection error...');
  });
}