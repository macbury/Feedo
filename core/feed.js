var request        = require('request');
var FeedParser     = require('feedparser');
var Item           = require('./item').Item;
var logger         = require('./logger').logger(module);
var Constants      = require("./constants");
var RedisConstants = Constants.RedisConstants;
var Sequelize      = require('sequelize');

require('date-utils');

function Feed(obj, dbHelper) {
  this.dbObject = obj;
  logger.info("New feed parser for: "+this.dbObject.id)
  this.broken = false;
  this.fetchCount  = 0;
  this.parser = new FeedParser();
  this.dbHelper = dbHelper;
  this.newItems = false;
  this.fetchedXML = false;
  var _this   = this;

  /*this.parser.on('title', function(title) {
    logger.info('title of feed is', title);
    _this.dbObject.title = title;
  });*/


  this.parser.on("article", function(article) {
    _this.onArticle(article);
  });

  this.parser.on("end", function() {
    _this.fetchedXML = true;
    _this.checkIfFinished();
  });

}

Feed.prototype.start = function(endCallback) {
  this.endCallback = endCallback;
  var _this   = this;
  try {
    request(this.dbObject.url, { followAllRedirects: true, timeout: Constants.FeedDownloadTimeout * 1000 }).on("error", function(error){
      _this.dbObject.errorMessage = JSON.stringify(error);
      _this.broken = true;
      _this.fetchedXML = true;
      _this.checkIfFinished();
    }).pipe(this.parser.stream);

  } catch(error) {
    this.dbObject.errorMessage = JSON.stringify(error);
    this.broken = true;
    this.fetchedXML = true;
    this.onEnd();
  }
}

Feed.prototype.popFeed = function() {
  this.fetchCount--;
  this.checkIfFinished();
}

Feed.prototype.stringStatus = function() {
  return JSON.stringify({ id: this.dbObject.id, fetchCount: this.fetchCount, fetchedXML: this.fetchedXML });
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
  item.onFinish = function (success) {
    var body = item.body;
    if (body == null || body.length < 60) {
      body = article.description;
    }

    _this.dbHelper.Item.create({
      url:     url,
      title:   article.title,
      pubDate: article.pubDate,
      body:    body,
      FeedId: _this.dbObject.id
    }).complete(function(error, itemModel) {
      if (error) {
        logger.error(error);
        _this.popFeed();
      } else {
        var chainer = new Sequelize.Utils.QueryChainer();
        for (var i = 0; i < item.images_fetched.length; i++) {
          var image = item.images_fetched[i];
          chainer.add(_this.dbHelper.Image.create({
            ItemId: itemModel.id,
            url: image.url,
            name: image.hash+image.ext,
            mimeType: image.mimeType,
            description: image.description
          }));
        }

        chainer.run().complete(function(error, im) {
          if (error) {
            logger.error(error);
          }
          _this.popFeed();
        });
      }
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
  if (this.fetchCount <= 0 && this.fetchedXML) {
    this.onEnd();
  };
}

Feed.prototype.onEnd = function() {
  logger.info("Ending syncing feed");
  
  if (this.broken) {
    if (this.dbObject.errorCount < Constants.MaxFeedFetchErrorCount) {
      this.dbObject.errorCount += 1;
    }
    
  } else {
    this.dbObject.errorMessage = null;
    this.dbObject.errorCount = 0;
  }

  if (this.newItems) {
    this.dbObject.lastRefresh = new Date();
  }

  this.dbObject.nextPull = new Date();
  this.dbObject.nextPull.addMinutes(Constants.RefreshEvery * (this.dbObject.errorCount + 1));
  this.dbObject.save();
  this.endCallback(this);
  logger.info("Finished, removing lock from feed, next check will be on: "+ JSON.stringify(this.dbObject.nextPull) + " for feed" +this.dbObject.id);
}

exports.Feed = Feed;