var mongoose = require('mongoose')
  , pageSchema = mongoose.Schema({
    title: {type: String, required: true},
    url: {type: String, required: true, unique: true},
    body: {type: String},
    layout: {type: String},
    menus: [{type: mongoose.Schema.Types.ObjectId, ref: 'PageMenu'}],
    sections: [{type: mongoose.Schema.Types.ObjectId, ref: 'PageSection'}],
    widgets: [{type: mongoose.Schema.Types.ObjectId, ref: 'PageWidget'}]
  })
  , pageMenuSchema = mongoose.Schema({
    key: {type: String, required: true, unique: true},
    created: {type: Date, default: Date.now},
    content: {type: Object}
  })
  , pageSectionSchema = mongoose.Schema({
    key: {type: String, required: true, unique: true},
    created: {type: Date, default: Date.now},
    type: {type: String},
    content: {type: Object}
  });

mongoose.model('PageMenu', pageMenuSchema);
mongoose.model('PageSection', pageSectionSchema);
var Page = mongoose.model('Page', pageSchema);

module.exports = {
  fetch: function(){
    return Page.find().populate('menus sections').lean().exec();
  }
};