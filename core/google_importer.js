require('date-utils');
var logger         = require('./logger').logger(module);

function GoogleImporter(dbHelper, currentUser, subscriptions) {
  this.user          = currentUser;
  this.dbHelper      = dbHelper;
  this.subscriptions = subscriptions;
}

GoogleImporter.prototype.run      = function() {
  var _this = this;
  process.nextTick(function() {
    _this.next();
  });
}

GoogleImporter.prototype.onFinish = function() {}

GoogleImporter.prototype.subscribe = function(feed) {
  var _this = this;
  logger.info("Subscribing feed: ", feed.url);
  this.user.hasSubscriptions(feed).complete(function(error, found) {
    if (!found) {
      logger.info("Feed subscribed: ", feed.url);
      _this.user.addSubscription(feed);
    } else {
      logger.info("Already subscribing", feed.url);
    }

    process.nextTick(function() {
      _this.next();
    });
  });
}

GoogleImporter.prototype.next = function() {
  var url = this.subscriptions.pop();
  logger.info("Pop from queue", url);
  var _this = this;
  if (url) {
    _this.dbHelper.Feed.find({ where: { url: url } }).complete(function(error, feed) {

      if (feed) {
        logger.info("Found feed: ", feed.url);
        _this.subscribe(feed);
      } else {
        logger.info("Creating new feed: ", url);
        _this.dbHelper.Feed.create({ url: url }).complete(function(error, newFeed) {
          _this.subscribe(newFeed);
        });
      }
    });
  } else {
    this.onFinish();
  }
}

exports.klass = GoogleImporter;