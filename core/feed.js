var FeedParser = require('feedparser');
var Item       = require('./item').Item;

function Feed(obj) {
  this.dbObject = obj;
  this.parser = new FeedParser();
  var _this   = this;
  this.parser.on('article', function(article){
    _this.onArticle(article);
  });
  this.parser.on('end', function(){
    _this.onEnd();
  });
  this.parser.parseFile(obj.url);
}

Feed.prototype.onArticle = function(article) {
  console.log("Article fetch");
  var item = new Item(article.link); 
}

Feed.prototype.onEnd = function() {
  console.log("Finished");
}

exports.Feed = Feed;