var Feed        = require('./feed').Feed;
var redisClient = require("redis").createClient();
var dbHelper    = null;
var RedisConstants = require("./constants").RedisConstants;

function getFeedsToSync() {
  console.log("Fetching feeds to sync");
  redisClient.lrange(RedisConstants.FeedLock, 0,-1, function(error, resp) {
    if (error) {
      console.log(error);
    } else {
      var a = resp;
      if (resp == null || resp.length == 0) {
        a.push(-1);  
      }
      console.log("Locked feeds: "+ JSON.stringify(resp));

      dbHelper.Feed.findAll({ where: [" Feeds.id NOT IN (?) AND (Feeds.nextPull IS NULL OR Feeds.nextPull < NOW()) ", a], limit: 10, order: "nextPull ASC" }).success(function(feeds) {
        for (var i = 0; i < feeds.length; i++) {
          var feedModel = feeds[i];
          redisClient.lpush(RedisConstants.FeedLock, parseInt(feedModel.id), function(error, resp) {
            if (error == null) {
              var feedParser = new Feed(feedModel, redisClient);  
            } else {
              console.log(error);
            }
          });
        };
      });
    }
  });
}

exports.sync = function(dbHelperTemp) {
  console.log('Staring sync, This process is pid ' + process.pid);
  redisClient.del(RedisConstants.FeedLock);
  dbHelper = dbHelperTemp;
  setInterval(function(){
    getFeedsToSync();
  }, 10 * 1000 + (Math.random() * 5));
}
