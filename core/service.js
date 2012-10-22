var Feed        = require('./feed').Feed;
var redis       = require("redis");
var redisClient = redis.createClient();
var gcm         = require('node-gcm');
var dbHelper    = null;
var Constants   = require("./constants");
var RedisConstants = Constants.RedisConstants;
redis.debug_mode = false;

var RunningFeeds = [];
var sender       = null;


function feedFetchHaveFinished(feedParser) {
  var index = RunningFeeds.indexOf(feedParser);
  if (index >= 0) {
    RunningFeeds.splice(index, 1);
  }

  console.log("Removing feed from quee, total parsers: " + RunningFeeds.length);
}

function getFeedsToSync() {
  if (RunningFeeds.length >= Constants.MaxFetch) {
    console.log("There are: " + RunningFeeds.length + " parsers of max: "+Constants.MaxFetch);
    return;
  };

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
      var diff = Constants.MaxFetch - RunningFeeds.length;

      if (diff <= 0) {
        return;
      };

      dbHelper.Feed.findAll({ where: [" Feeds.id NOT IN (?) AND (Feeds.nextPull IS NULL OR Feeds.nextPull < NOW()) ", a], limit: diff, order: "nextPull ASC" }).success(function(feeds) {
        for (var i = 0; i < feeds.length; i++) {
          var feedModel = feeds[i];
          redisClient.lpush(RedisConstants.FeedLock, feedModel.id.toString());
          var feedParser = new Feed(feedModel, redisClient, dbHelper); 
          RunningFeeds.push(feedParser);
          feedParser.start(feedFetchHaveFinished);
        };
      });
    }
  });
}

exports.sync = function(dbHelperTemp, config) {
  console.log('Staring sync, This process is pid ' + process.pid);
  sender = new gcm.Sender(config.gcm.key);
  redisClient.del(RedisConstants.FeedLock);
  dbHelper = dbHelperTemp;
  setInterval(function(){
    getFeedsToSync();
  }, 2 * 1000);
}
