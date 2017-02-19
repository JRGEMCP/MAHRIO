'use strict';

var mongoose = require('mongoose'),
  schema = mongoose.Schema({
    key: {type: String, required: true, unique: true},
    created: {type: Date, default: Date.now},
    content: {type: Object}
  }),
  PageMenu = mongoose.model('PageMenu', schema);

module.exports = PageMenu;