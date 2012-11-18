require('date-utils');
var logger         = require('./logger').logger(module);
var Sequelize      = require("sequelize");
function GoogleImporter(dbHelper, currentUser, subscriptions) {
  this.user              = currentUser;
  this.dbHelper          = dbHelper;
  this.subscriptions     = subscriptions;
  this.modelsToSubscribe = [];
  logger.info("Creating Google Importer!");
}

GoogleImporter.prototype.run      = function() {
  logger.info("Running google importer");
  var _this = this;
  process.nextTick(function() {
    _this.next();
  });
}

GoogleImporter.prototype.onFinish = function() {}

GoogleImporter.prototype.subscribe = function(feed) {
  var _this = this;
  logger.info("Subscribing feed: ", feed.url);
  this.dbHelper.db.query("SELECT count(*) FROM FeedsUsers WHERE FeedsUsers.UserId = "+this.user.id+" AND FeedsUsers.FeedId = "+feed.id+";").success(function(count) {
    var count = parseInt(count[0]['count(*)']);
    logger.debug("Count for item test", count);
    
    if (count == 0) {
      logger.info("Feed subscribed: ", feed.url);
      _this.modelsToSubscribe.push(feed);
      process.nextTick(function() {
        _this.next();
      });
    } else {
      logger.info("Already subscribing", feed.url);
      process.nextTick(function() {
        _this.next();
      });
    }
  }).on("error", function(error){
    logger.info("Could not subscribe object");
    //logger.error(error);
    process.nextTick(function() {
      _this.next();
    });
  });
}

GoogleImporter.prototype.addSubscriptions = function() {
  var _this = this;
  logger.info("Inserting subscriptions for user");

  var chainer = new Sequelize.Utils.QueryChainer();

  for (var i = 0; i < this.modelsToSubscribe.length; i++) {
    var feed = this.modelsToSubscribe[i];
    var SQL = "INSERT INTO `FeedsUsers` (`FeedId`,`UserId`) VALUES ("+feed.id+","+this.user.id+")";
    logger.info("Preparing SQL: ", SQL);
    chainer.add(this.dbHelper.db.query(SQL));    
  }

  chainer.run().complete(function(error, subscription) {
    logger.info("Finished importing google account");
    _this.onFinish();
  });
}

GoogleImporter.prototype.next = function() {
  var url = this.subscriptions.pop();
  logger.info("Pop from queue", url);
  var _this = this;
  if (url) {
    _this.dbHelper.Feed.find({ where: { url: url } }).success(function(feed) {

      if (feed) {
        logger.info("Found feed: ", feed.url);
        _this.subscribe(feed);
      } else {
        logger.info("Creating new feed: ", url);
        var nextPull = new Date();
        nextPull.addMinutes(1);
        _this.dbHelper.Feed.create({ url: url, nextPull: nextPull, ready: false }).success(function(newFeed) {
          logger.info("Feed created! New id is: ", newFeed.id);
          _this.subscribe(newFeed);  
        }).on("error", function(error){
          //logger.error(error);
          _this.next();
        });
      }
    }).on("error", function(error){
      logger.error("Could not find feed");
      //logger.error(error);
      process.nextTick(function() {
        _this.next();
      });
    });
  } else {
    this.addSubscriptions();
    
  }
}

exports.klass = GoogleImporter;