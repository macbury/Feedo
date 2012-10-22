var FeedParser = require('feedparser');
var Item       = require('./item').Item;
require('date-utils');

var RedisConstants = require("./constants").RedisConstants;

var RefreshTime = 5;

function Feed(obj, redisClient) {
  this.redisClient = redisClient;
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
  this.dbObject.nextPull = new Date();
  this.dbObject.nextPull.addMinutes(RefreshTime)
  this.dbObject.save();
  console.log("Finished, removing lock from feed, next check will be on: "+ JSON.stringify(this.dbObject.nextPull));
  this.redisClient.lrem(RedisConstants.FeedLock, 0, this.dbObject.id);
}

exports.Feed = Feed;