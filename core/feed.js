var FeedParser = require('feedparser');
var request    = require('request');
var FeedMe = require('feedme')
  , parser = new FeedMe();
var Item       = require('./item').Item;
require('date-utils');

var RedisConstants = require("./constants").RedisConstants;

var RefreshTime = 5;

function Feed(obj, redisClient) {
  this.dbObject = obj;
  console.log("New feed parser for: "+this.dbObject.id)
  this.broken = false;
  this.redisClient = redisClient;
  this.fetchCount  = 0;
  this.parser = new FeedMe();
  var _this   = this;

  this.parser.on('title', function(title) {
    console.log('title of feed is', title);
    _this.dbObject.title = title;
  });

  this.parser.on("type", function(type) {
    console.log("Feed type: "+ type);
  });

  this.parser.on("item", function(item) {
    _this.onArticle(item);
  });

  this.parser.on("end", function() {
    _this.checkIfFinished();
  });

  try {
    request(obj.url, { followAllRedirects: true, timeout: 10000 }).on("error", function(error){
      _this.dbObject.errorMessage = JSON.stringify(error);
      _this.broken = true;
      _this.onEnd();
    }).pipe(this.parser)
  } catch(error) {
    this.dbObject.errorMessage = JSON.stringify(error);
    this.broken = true;
    this.onEnd();
  }
}

Feed.prototype.onArticle = function(article) {
  console.log("New article");
  var _this = this;
  this.fetchCount++;
  var item = new Item(article); 
  item.onFinish = function () {
    _this.fetchCount--;
    _this.checkIfFinished();
  }

  item.download();
  
}

Feed.prototype.checkIfFinished = function() {
  console.log("Downloads left for feed: "+ this.dbObject.id + " is: "+this.fetchCount);
  if (this.fetchCount <= 0) {
    this.onEnd();
  };
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
  console.log("Finished, removing lock from feed, next check will be on: "+ JSON.stringify(this.dbObject.nextPull) + " for feed" +this.dbObject.id);
  this.redisClient.lrem(RedisConstants.FeedLock, 0, this.dbObject.id.toString());
}

exports.Feed = Feed;