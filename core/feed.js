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
      _this.dbObject.errorMessage = JSON.stringify(error);
      _this.broken = true;  
    } else {
      _this.dbObject.title = meta.title;
    }
    
    _this.onEnd();
  });

  this.timeoutTimer = setTimeout(function() {
    console.log("Timeout!");
    _this.dbObject.errorMessage = "Timeout";
    _this.broken = true; 
    _this.parser.stream.end();
    _this.onEnd();
  }, 15000);
}

Feed.prototype.onArticle = function(article) {
  console.log("Article fetch");
  var item = new Item(article.link); 
}

Feed.prototype.onEnd = function() {
  console.log("Ending syncing feed");
  clearTimeout(this.timeoutTimer);
  if (this.broken) {
    this.dbObject.errorCount += 1;
  } else {
    this.dbObject.errorMessage = null;
    this.dbObject.errorCount = 0;
  }
  this.dbObject.nextPull = new Date();
  this.dbObject.nextPull.addMinutes(RefreshTime * (this.dbObject.errorCount + 1));
  this.dbObject.save();
  console.log("Finished, removing lock from feed, next check will be on: "+ JSON.stringify(this.dbObject.nextPull));
  this.redisClient.lrem(RedisConstants.FeedLock, 0, this.dbObject.id);
}

exports.Feed = Feed;