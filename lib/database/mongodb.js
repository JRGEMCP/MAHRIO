const Mongoose = require('mongoose');

require('./models/page');
require('./models/menu');
require('./models/section');

var Page = Mongoose.model('Page')
  , Menu = Mongoose.model('PageMenu');

module.exports = function( config ){
  var canReject = true;

  Mongoose.connect(config.mongo);

  Mongoose.Promise = require('bluebird');

  var db = Mongoose.connection;

  db.on('connecting', function() {
    console.log('connecting to MongoDB...');
  });
  db.on('connected', function() {
    console.log('MongoDB connected!');
  });
  db.on('reconnected', function () {
    console.log('MongoDB reconnected!');
  });

  return new Promise(function(resolve, reject){
    db.on('error', function(){
      console.error('db connection error...');
      canReject && reject();
    });
    db.once('open', function () {
      console.log('db connection opened');
      var pages = null;
      Page.find().populate('sections').lean().exec().then( function(data){
        console.log('Loaded ' + data.length + ' Pages');
        pages = data;
        return Menu.find().lean().exec();
      })
        .then(function(menu){
          canReject = false;
          resolve( [pages, menu.length ? menu[0] : null] );
        })
        .catch(function(){
          console.log('error fetching pages...');
          reject();
        });
    });
  });
}