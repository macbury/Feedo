var FeedParser = require('feedparser');
var Item       = require('./item').Item;
require('date-utils');

var RedisConstants = require("./constants").RedisConstants;

var RefreshTime = 5;

function Feed(obj, redisClient) {
  this.broken = false;
  this.redisClient = redisClient;
  this.dbObject = obj;
  this.parser = new FeedParser({
    strict: true,
  });
  var _this   = this;
  this.parser.on('article', function(article){
    _this.onArticle(article);
  });

  this.parser.parseFile(obj.url, {}, function (error, meta, articles) {
    if (error) {
      _this.dbObject.errorMessage = error;
      _this.broken = true;  
    } else {
      _this.dbObject.title = meta.title;
    }
    
    _this.onEnd();
  });
}

Feed.prototype.onArticle = function(article) {
  console.log("Article fetch");
  var item = new Item(article.link); 
}

Feed.prototype.onEnd = function() {
  if (this.broken) {
    this.dbObject.errorCount += 1;
  } else {
    this.dbObject.errorCount = 0;
  }
  this.dbObject.nextPull = new Date();
  this.dbObject.nextPull.addMinutes(RefreshTime * (this.dbObject.errorCount + 1));
  this.dbObject.save();
  console.log("Finished, removing lock from feed, next check will be on: "+ JSON.stringify(this.dbObject.nextPull));
  this.redisClient.lrem(RedisConstants.FeedLock, 0, this.dbObject.id);
}

exports.Feed = Feed;