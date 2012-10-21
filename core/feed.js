var FeedParser = require('feedparser');
var Item       = require('./item').Item;
function Feed(obj) {
  this.parser = new FeedParser();
  var _this   = this;
  this.parser.on('article', function(article){
    _this.onArticle(article);
  });
  this.parser.on('end', function(){
    _this.onEnd();
  });
  var feedURL = 'http://natemat.pl/rss/wszystkie';
  this.parser.parseFile(feedURL);
}

Feed.prototype.onArticle = function(article) {
  console.log("Article fetch");
  var item = new Item(article.link); 
}

Feed.prototype.onEnd = function() {
  console.log("Finished");
}

exports.Feed = Feed;