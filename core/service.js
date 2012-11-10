var Feed        = require('./feed').Feed;
var RedisQueue  = require('./redis_queue').RedisQueue;
var gcm         = require('node-gcm');
var dbHelper    = null;
var Constants   = require("./constants");
var RedisConstants = Constants.RedisConstants;

var RunningFeeds = [];
var sender       = null;
var redisQueue   = null;
var logger       = require('./logger').logger(module);

function feedFetchHaveFinished(feedParser) {
  var index = RunningFeeds.indexOf(feedParser);
  if (index >= 0) {
    RunningFeeds.splice(index, 1);
  }

  logger.info("Removing feed from quee, total parsers: " + RunningFeeds.length);

  if (feedParser.newItems) {
    logger.info("New items for feed");
    var message = new gcm.Message();
    var registrationIds = ["APA91bFcEilK6PjWMEAIHPiAsJ7_ekQR08rtV5ju1qWkLu4H6_H_so5DxNalxYy0TZFVimfTfnd7hobGb9HB6CEroYi9q2pU5moZLHmIufOF5szZdfRp3EEzt1RU0Ibp1s1mj3bGX2nOecGNkLkQ39uvOmPIULl_jQ"];
    
    message.addData('action','refresh');
    message.collapseKey = 'refresh';

    //sender.send(message, registrationIds, 4, function (result) {
      //logger.info(result);
    //});
  }
}

function nextPopQueue() {
  //logger.info("Adding next PopQueue request: ", Constants.AskForNewFeeds);
  setTimeout(getFeedsToSync, Constants.AskForNewFeeds * 1000);
}

function getFeedsToSync() {
  if (RunningFeeds.length >= Constants.MaxRunningJobsPerWorker) {
    logger.info("There are: " + RunningFeeds.length + " parsers of max on this worker: "+Constants.MaxRunningJobsPerWorker);
    for (var i = 0; i < RunningFeeds.length; i++) {
      //logger.debug(RunningFeeds[i].stringStatus());
      RunningFeeds[i].checkIfFinished();
    }
    nextPopQueue();
    return;
  };

  redisQueue.fetchFeedModelId(function(modelId) {
    logger.info("Feed id is: "+ modelId)
    if (!modelId) {
      nextPopQueue();
      return;
    }

    dbHelper.Feed.find({ where: { id: modelId } }).success(function(feedModel) {
      logger.info("New feed to parse: "+ feedModel.url);
      var feedParser = new Feed(feedModel, dbHelper); 
      RunningFeeds.push(feedParser);
      feedParser.start(feedFetchHaveFinished);
      nextPopQueue();
    });
  });
}

exports.sync = function(dbHelperTemp, config) {
  logger.info('Staring sync, This process is pid ' + process.pid);
  sender = new gcm.Sender(config.gcm.api_key);
  redisQueue = new RedisQueue(config.redis);
  dbHelper = dbHelperTemp;
  getFeedsToSync();

  process.send(Constants.WorkerStatus.Ready);
}
