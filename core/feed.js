var request        = require('request');
var FeedParser     = require('feedparser');
var Item           = require('./item').Item;
var logger         = require('./logger').logger(module);
var Constants      = require("./constants");
var RedisConstants = Constants.RedisConstants;
var Sequelize      = require('sequelize');
var charset        = require('charset');
var Iconv          = require('iconv').Iconv;

require('date-utils');

function Feed(obj, dbHelper) {
  this.dbObject    = obj;
  this.broken      = false;
  this.fetchCount  = 0;
  this.parser      = new FeedParser();
  this.dbHelper    = dbHelper;
  this.newItems    = false;
  this.fetchedXML  = false;
  this.articles    = [];
  this.articles_hash = {};
  this.articles_to_check = [];

  if (this.dbObject.lastRefresh == null) {
    this.dbObject.lastRefresh = Date.yesterday().addDays(-7);
  }

  var _this        = this;

  logger.info("New feed parser for: ",this.dbObject.url);
  
  /*this.parser.on('title', function(title) {
    logger.info('title of feed is', title);
    _this.dbObject.title = title;
  });*/

  this.parser.on("article", function(article) {
    logger.info("Found article in rss xml");
    _this.articles.push(article);
  });

  this.parser.on("error", function(error) {
    _this.onError(error);
  });

  this.parser.on("end", function() {
    logger.info("End of rss file");
    _this.fetchedXML = true;
    _this.processArticles();
  });

}

Feed.prototype.processArticles = function() {
  var _this = this;
  this.articles_urls = [];
  this.dbObject.ready = true;

  for (var i=0; i < this.articles.length; i++) {
    var article = this.articles[i];
    this.dbObject.title = article.meta.title;
    if (article.pubDate == null || article.pubDate >= this.dbObject.lastRefresh) {
      logger.info("New article appered since(pubDate/lastRefresh): ", [article.pubDate, this.dbObject.lastRefresh]);
      this.articles_urls.push(article.link);  
      this.articles_hash[article.link] = article;
    } else {
      logger.info("Skipping article since(pubDate/lastRefresh): ", [article.pubDate, this.dbObject.lastRefresh]);
    }
  }
  
  if (this.dbObject.title == null) {
    this.dbObject.title = "Feed "+this.dbObject.id.toString();
  }

  if (this.articles_urls.length == 0) {
    logger.info("There are no new items since", this.dbObject.lastRefresh);
    this.onEnd();
  } else {
    var query_array = JSON.parse(JSON.stringify(this.articles_urls));
    logger.info("Checking for diffrence between db and rss ", this.articles_urls);
    this.dbHelper.Item.findAll({ where: { url: query_array, FeedId: this.dbObject.id } }).success(function(items){
      var items_count = 0;
      if (items != null) { items_count = items.length };
      if(items == null || items_count == _this.articles_urls.length) {
        _this.newItems = false;
        logger.info("No new articles found");
        _this.onEnd();
      } else {
        _this.articles = [];
        var articles_urls_in_db = [];
        
        for (var i=0; i < items.length; i++) {
          var item = items[i];
          articles_urls_in_db.push(item.url);
        }
        logger.info("Articles in DB: ", articles_urls_in_db);
        logger.info("Articles in RSS: ", _this.articles_urls);
        
        for (var i=0; i < _this.articles_urls.length; i++) {
          var article_url = _this.articles_urls[i];
          
          if (articles_urls_in_db.indexOf(article_url) == -1) {
            logger.info("New article url to download: ", article_url);
            _this.articles.push(_this.articles_hash[article_url]);
          } else {
            logger.info("We have this article in db: ", article_url);
          }
        };
        
        _this.newItems = (_this.articles.length > 0);
        _this.nextArticle();
      }
    }).error(function(error) {
      logger.error("Could not check in db for new feeds", error);
      _this.onEnd();
    });
  }
  
}

Feed.prototype.nextSynchronizedArticle = function() {
  var _this = this;
  var article = this.articles.pop();
  
  if (article) {
    var url = article.link;
    if (url == null) {
      logger.info("URL for this article is null!", article);
      this.nextSynchronizedArticle();
    } else {
      logger.info("Poped new article from queu ", article.link);
      
      var item      = new Item(url, article); 
      item.dbHelper = this.dbHelper;
      item.onFinish = function (success) { _this.insertArticleToDB(article, item); };
      item.download();
    }
  } else {
    this.onEnd();
  }
}

Feed.prototype.nextArticle = function() {
  var _this = this;
  process.nextTick(function() {
    _this.nextSynchronizedArticle();
  });
}

Feed.prototype.onError = function(error) {
  this.dbObject.errorMessage = JSON.stringify(error);
  this.broken = true;
  this.fetchedXML = true;
  this.onEnd();
}

Feed.prototype.start = function(endCallback) {
  this.endCallback = endCallback;
  var _this   = this;
  try {
    request(this.dbObject.url, { followAllRedirects: true, timeout: Constants.FeedDownloadTimeout * 1000, encoding: 'binary' }, function (error, response, body) {
      if (error) {
        _this.dbObject.errorMessage = JSON.stringify(error);
        _this.broken = true;
        _this.fetchedXML = true;
        _this.checkIfFinished();
      } else {
        var encoding = charset(response.headers, body);
        var bufferHtml = new Buffer(body, 'binary');

        if (encoding && !encoding.match(/utf/)) {
          logger.info("encoding is not utf-8, but it is:" + encoding);

          var iconv = new Iconv(encoding, 'utf-8');
          body      = iconv.convert(bufferHtml);
        } else {
          body      = bufferHtml;
        }
        _this.parser.parseString(body);  
      }
      
    });

  } catch(error) {
    this.onError(error);
  }
}

Feed.prototype.popFeed = function() {
  this.fetchCount--;
  this.checkIfFinished();
}

Feed.prototype.stringStatus = function() {
  return JSON.stringify({ id: this.dbObject.id, fetchCount: this.fetchCount, fetchedXML: this.fetchedXML });
}

Feed.prototype.insertArticleToDB = function(article, item) {
  var _this = this;
  this.dbHelper.Item.create({
    url:     article.link,
    title:   article.title,
    pubDate: article.pubDate,
    body:    item.body,
    hash:    item.hash,
    FeedId: _this.dbObject.id
  }).complete(function(error, itemModel) {
    if (error) {
      logger.error(error);
      _this.nextSynchronizedArticle();
    } else {
      var chainer = new Sequelize.Utils.QueryChainer();
      for (var i = 0; i < item.images_fetched.length; i++) {
        var image = item.images_fetched[i];
        chainer.add(_this.dbHelper.Image.create({
          ItemId: itemModel.id,
          url: image.url,
          name: image.hash+image.ext,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
          description: image.description
        }));
      }

      chainer.run().complete(function(error, im) {
        if (error) {
          logger.error(error);
        }
        _this.nextSynchronizedArticle();
      });
    }
  });
}

Feed.prototype.checkIfFinished = function() {
  logger.info("Downloads left for feed: "+ this.dbObject.id + " is: "+this.fetchCount);
  if (this.articles.length <= 0) {
    this.onEnd();
  };
}

Feed.prototype.onEnd = function() {
  logger.info("Ending syncing feed: ", this.dbObject.url);
  var _this = this;

  if (this.newItems) {
    logger.debug("New items, setting emptyFetchCount to 0");
    this.dbObject.emptyFetchCount = 0;
    this.dbObject.lastRefresh     = new Date();
  } else {
    logger.debug("No new items(emptyFetchCount, MaxEmptyRefresh): ", [this.dbObject.emptyFetchCount, Constants.MaxEmptyRefresh]);
    this.dbObject.emptyFetchCount += 1;
    if (this.dbObject.emptyFetchCount > Constants.MaxEmptyRefresh) {
      this.dbObject.emptyFetchCount = Constants.MaxEmptyRefresh;
    }
  }

  if (this.broken) {
    this.dbObject.errorCount += 1;
  } else {
    this.dbObject.errorMessage = null;
    this.dbObject.errorCount = 0;
  }


  this.dbObject.nextPull = new Date();
  this.dbObject.nextPull.addMinutes(Constants.RefreshEvery * (this.dbObject.emptyFetchCount+1));
  logger.info("Finished, removing lock from feed, next check will be on: "+ JSON.stringify(this.dbObject.nextPull) + " for feed" +this.dbObject.id);
  this.dbObject.save().complete(function(error, status){
    _this.endCallback(_this);
  }); 
}

exports.Feed = Feed;