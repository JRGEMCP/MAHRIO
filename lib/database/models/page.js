'use strict';

var mongoose = require('mongoose'),
  schema = mongoose.Schema({
    title: {type: String, required: true},
    url: {type: String, required: true, unique: true},
    body: {type: String},
    layout: {type: String},
    menus: [{type: mongoose.Schema.Types.ObjectId, ref: 'PageMenu'}],
    sections: [{type: mongoose.Schema.Types.ObjectId, ref: 'PageSection'}],
    widgets: [{type: mongoose.Schema.Types.ObjectId, ref: 'PageWidget'}]
  }),
  Page = mongoose.model('Page', schema);

module.exports = Page;