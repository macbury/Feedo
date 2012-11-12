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

  if (feedParser.newItems) {
    logger.info("New items for feed, sending notification to user devices");
    feedParser.dbObject.getUsers().success(function(users) {
      var uids = [];
      for (var i = users.length - 1; i >= 0; i--) {
        uids.push(users[i].id);
      }
      if (uids.length > 0) {
        logger.info("Users to push notifications:", uids);
        dbHelper.Token.findAll({ where: ["UserId IN (?) AND gcm_key IS NOT NULL", uids] }).success(function(tokens){
          var message = new gcm.Message();
          var registrationIds = [];
          for (var i = tokens.length - 1; i >= 0; i--) {
            registrationIds.push(tokens[i].gcm_key);
          }
          if (registrationIds.length > 0) {
            logger.info("Devices to push notifications:", registrationIds);
            message.addData('action','refresh');
            message.collapseKey = 'refresh';
            sender.send(message, registrationIds, 4, function (result) {
              logger.info("Pushed refresh notification to device:", registrationIds);
              logger.info(result);
            });
          }
        });
      }
    });
    
  }
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
          var feedParser = new Feed(feedModel, dbHelper); 
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
