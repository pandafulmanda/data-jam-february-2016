var _ = require('lodash');

var SEARCH_TERMS = ['alcoholic', 'depressed', 'depression', 'suicide'];
var DATA_PATH = 'data/'
var SOURCE_FILE = '_tweets.json';
var SEPARATOR = '\t';

var FEATURES = [{
  name: 'Date',
  extract: 'timestamp_ms'
}, {
  name: 'Term',
  extract: function (data, searchTerms){
    return tagTerm(data.text, searchTerms);
  }
}, {
  name: 'Tweet',
  extract: 'text'
}, {
  name: 'Lat',
  extract: 'geo.coordinates[0]'
}, {
  name: 'Long',
  extract: 'geo.coordinates[1]'
}, {
  name: 'N_followers',
  extract: 'user.followers_count'
}];

var HEADER = _.map(FEATURES, 'name').join(SEPARATOR);

var config = {
  searchTerms: SEARCH_TERMS,
  dataPath: DATA_PATH,
  sourceFile: SOURCE_FILE,
  separator: SEPARATOR,
  features: FEATURES,
  header: HEADER
};


// function to tag tweets
function tagTerm(text, terms){
  var searchText = text.toUpperCase();
  // find the tag that exists in the searchText
  var tag = terms.filter( function (term) { return searchText.indexOf(term) > -1; });
  return tag[0];
}

module.exports = {config: config, tagTerm: tagTerm};