var redis          = require("redis");
var RedisConstants = require("./constants").RedisConstants;

function RedisQueue(config) {
  this.redisClient = redis.createClient();
  this.redisClient.del(RedisConstants.FeedLock);
}

RedisQueue.prototype.lockedFeeds = function(cb) {
  this.redisClient.lrange(RedisConstants.FeedLock, 0,-1, function(error, lockedFeedsArray) {
    if (error) {
      console.error(error);
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
  console.log("Adding "+feedModel.url + " to queue");
}

exports.RedisQueue = RedisQueue;