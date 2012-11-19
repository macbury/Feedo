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
var fs           = require('fs');
require('date-utils');

process.on('uncaughtException', function(error) {
  logger.error(error);
  logger.error(error.stack);
  throw(error);
});


function feedFetchHaveFinished(feedParser) {
  var index = RunningFeeds.indexOf(feedParser);
  if (index >= 0) {
    RunningFeeds.splice(index, 1);
  }

  logger.info("Removing feed from quee, total parsers: " + RunningFeeds.length);
}

function nextPopQueue() {
  //logger.info("Adding next PopQueue request: ", Constants.AskForNewFeeds);
  setTimeout(getFeedsToSync, Constants.AskForNewFeeds * 1000);
}

function getFeedsToSync() {
  logger.info("There are: " + RunningFeeds.length + " parsers of max on this worker: "+Constants.MaxRunningJobsPerWorker);
  if (RunningFeeds.length >= Constants.MaxRunningJobsPerWorker) {
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
      if (feedModel) {
        logger.info("New feed to parse: "+ feedModel.url);
        feedModel.nextPull = new Date();
        feedModel.nextPull.addMinutes(100); //TODO find better solutions for locking
        feedModel.save().complete(function(error, status) {
          var feedParser = new Feed(feedModel, dbHelper, sender); 
          RunningFeeds.push(feedParser);
          feedParser.start(feedFetchHaveFinished);
          nextPopQueue();  
        });
      } else {
        nextPopQueue();  
      }
      
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
