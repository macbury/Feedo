var redis          = require("redis");
var RedisConstants = require("./constants").RedisConstants;
var logger         = require('./logger').logger(module);
function RedisQueue(config) {
  this.redisClient = redis.createClient();
  //this.redisClient.del(RedisConstants.FeedLock);
}

RedisQueue.prototype.lockedFeeds = function(cb) {
  this.redisClient.lrange(RedisConstants.FeedLock, 0,-1, function(error, lockedFeedsArray) {
    if (error) {
      logger.error("Could not fetch locked feeds", error);
    } else {
      var a = lockedFeedsArray;
      if (lockedFeedsArray == null || lockedFeedsArray.length == 0) {
        a.push(-1);  
      }
      cb(a);
    }
  });
}

RedisQueue.prototype.addFeedToQueue = function(feedModel) {
  this.redisClient.lpush(RedisConstants.FeedLock, feedModel.id.toString());
  logger.info("Adding "+feedModel.url + " to queue");
}

RedisQueue.prototype.fetchFeedModelId = function(callback) {
  this.redisClient.brpop(RedisConstants.FeedLock, 0, function(error, response) {
    if (response == true) {
      callback(false);
    } else if (error) {
      logger.error("Could not fetch locked feed", error);
      callback(false);
    } else {
      var feedModelID = response[1];
      logger.info("Removed from queue feed: "+feedModelID);
      callback(feedModelID);
    }
  });
}

exports.RedisQueue = RedisQueue;