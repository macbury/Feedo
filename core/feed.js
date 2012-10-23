var request    = require('request');
var FeedParser = require('feedparser');
var Item       = require('./item').Item;
var logger     = require('./logger').logger(module);
require('date-utils');

var RedisConstants = require("./constants").RedisConstants;

var RefreshTime = 5;

function Feed(obj, dbHelper) {
  this.dbObject = obj;
  logger.info("New feed parser for: "+this.dbObject.id)
  this.broken = false;
  this.fetchCount  = 0;
  this.parser = new FeedParser();
  this.dbHelper = dbHelper;
  this.newItems = false;
  var _this   = this;

  /*this.parser.on('title', function(title) {
    logger.info('title of feed is', title);
    _this.dbObject.title = title;
  });*/


  this.parser.on("article", function(article) {
    _this.onArticle(article);
  });

  this.parser.on("end", function() {
    _this.checkIfFinished();
  });

}

Feed.prototype.start = function(endCallback) {
  this.endCallback = endCallback;
  var _this   = this;
  try {
    request(this.dbObject.url, { followAllRedirects: true, timeout: 10000 }).on("error", function(error){
      _this.dbObject.errorMessage = JSON.stringify(error);
      _this.broken = true;
      _this.onEnd();
    }).pipe(this.parser.stream);

  } catch(error) {
    this.dbObject.errorMessage = JSON.stringify(error);
    this.broken = true;
    this.onEnd();
  }
}

Feed.prototype.onArticle = function(article) {
  var _this = this;

  var url = article.link;

  if (url == null) {
    logger.info("URL for this article is null!", article);
    return;
  }
  this.dbObject.title = article.meta.title;
  
  var item = new Item(url); 
  item.onFinish = function () {
    var body = item.body;
    if (body == null || body.length < 60) {
      body = article.description;
    }

    _this.dbHelper.Item.create({
      url:     url,
      title:   article.title,
      pubDate: article.pubDate,
      body:    item.body,
      FeedId: _this.dbObject.id
    }).success(function(){
      _this.fetchCount--;
      _this.checkIfFinished();
    }).error(function(error) {
      logger.error(error);
    });
  }

  this.dbObject.getItems({ where: { url: url } }).success(function(items){
    if (items == null || items.length == 0) {
      logger.info("New article to download :"+ url);
      _this.fetchCount++;
      _this.newItems = true;
      item.download();  
    } else {
      logger.info("Skipping article to download: "+ url);
    }
  }).error(function(error){
    logger.error(error);
    _this.checkIfFinished();
  })

}

Feed.prototype.checkIfFinished = function() {
  logger.info("Downloads left for feed: "+ this.dbObject.id + " is: "+this.fetchCount);
  if (this.fetchCount <= 0) {
    this.onEnd();
  };
}

Feed.prototype.onEnd = function() {
  logger.info("Ending syncing feed");
  this.endCallback(this);
  if (this.broken) {
    this.dbObject.errorCount += 1;
  } else {
    this.dbObject.errorMessage = null;
    this.dbObject.errorCount = 0;
  }

  if (this.newItems) {
    this.dbObject.lastRefresh = new Date();
  }

  this.dbObject.nextPull = new Date();
  this.dbObject.nextPull.addMinutes(RefreshTime * (this.dbObject.errorCount + 1));
  this.dbObject.save();
  logger.info("Finished, removing lock from feed, next check will be on: "+ JSON.stringify(this.dbObject.nextPull) + " for feed" +this.dbObject.id);
}

exports.Feed = Feed;