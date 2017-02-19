'use strict';

var mongoose = require('mongoose'),
  schema = mongoose.Schema({
    key: {type: String, required: true, unique: true},
    created: {type: Date, default: Date.now},
    type: {type: String},
    content: {type: Object}
  }),
  PageSection = mongoose.model('PageSection', schema);

module.exports = PageSection;