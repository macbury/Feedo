var Feed        = require('./feed').Feed;
var RedisQueue  = require('./redis_queue').RedisQueue;
var gcm         = require('node-gcm');
var dbHelper    = null;
var Constants   = require("./constants");
var RedisConstants = Constants.RedisConstants;

var RunningFeeds = [];
var sender       = null;
var redisQueue   = null;

function feedFetchHaveFinished(feedParser) {
  var index = RunningFeeds.indexOf(feedParser);
  if (index >= 0) {
    RunningFeeds.splice(index, 1);
  }

  console.log("Removing feed from quee, total parsers: " + RunningFeeds.length);
}

function getFeedsToSync() {
  if (RunningFeeds.length >= Constants.MaxRunningJobsPerWorker) {
    console.log("There are: " + RunningFeeds.length + " parsers of max on this worker: "+Constants.MaxRunningJobsPerWorker);
    return;
  };

  redisQueue.fetchFeedModelId(function(modelId) {
    console.log("Feed id is: "+ modelId)
    if (modelId == null) {
      return;
    }

    dbHelper.Feed.find({ where: { id: modelId } }).success(function(feedModel) {
      console.log("New feed to parse: "+ feedModel.url);
      var feedParser = new Feed(feedModel, dbHelper); 
      RunningFeeds.push(feedParser);
      feedParser.start(feedFetchHaveFinished);
    });
  });
}

exports.sync = function(dbHelperTemp, config) {
  console.log('Staring sync, This process is pid ' + process.pid);
  sender = new gcm.Sender(config.gcm.key);
  redisQueue = new RedisQueue(config.redis);
  dbHelper = dbHelperTemp;
  setInterval(function(){
    getFeedsToSync();
  }, Constants.AskForNewFeeds * 100);
}
