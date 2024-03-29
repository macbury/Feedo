var cluster         = require('cluster');
var numCPUs         = require('os').cpus().length;
var DatabaseHelper  = require('./db').DatabaseHelper;
var RedisQueue      = require('./redis_queue').RedisQueue;
var Constants       = require("./constants");
var RedisConstants  = require("./constants").RedisConstants;
var logger          = require('./logger').logger(module);
var repl            = require("repl");
function WorkerManager(config) {
  var _this              = this;
  this.dbHelper          = new DatabaseHelper(config.db);
  this.redis             = new RedisQueue(config.redis);
  this.maxWorkers        = numCPUs;
  this.emptyRefreshCount = 1;
  this.dbHelper.sync().run().success(function(){
    _this.asRepl();
    _this.startWorkers(_this.maxWorkers);
  });


  cluster.on('exit', function(worker, code, signal) {
    logger.error('worker ' + worker.process.pid + ' died');

    var worker = cluster.fork();
    logger.info('Staring new ' + worker.process.pid);
  });
}

WorkerManager.prototype.asRepl = function() {
  var c = repl.start({
    prompt: "feedo> ",
    input: process.stdin,
    output: process.stdout,
    useGlobal: false
  });

  c.context.m  = 'test';
  c.context.db = this.dbHelper;
}

WorkerManager.prototype.onWorkerMessage = function(message) {
  logger.info("Recived worker message: " + message);
  if (Constants.WorkerStatus.Ready == message) {
    this.totalWorkers--;
    logger.info("Workers left: ", this.totalWorkers);
    if (this.totalWorkers <= 0) {
      logger.info("Workers finished spawning. Starting refresh queueu");
      this.waitForFeeds();// TODO Remove this comment 
    }
  }
}

WorkerManager.prototype.startWorkers = function(num) {
  logger.info("DB synced! Forking workers: ");
  this.totalWorkers = 0;
  var _this = this;
  for (var i = 0; i < num; i++) {
    var worker = cluster.fork();
    worker.on('message', function(message) { _this.onWorkerMessage(message); });

    this.totalWorkers++;
    logger.info('Staring ' + worker.process.pid);
  }
}



WorkerManager.prototype.waitForFeeds = function() {
  var _this = this;
  setTimeout(function(){
    _this.refreshQueue();
  }, 1000 * this.emptyRefreshCount);
}

WorkerManager.prototype.refreshQueue = function(){
  var _this = this;
  this.redis.lockedFeeds(function(feed_ids) {
    logger.info("Locked feeds: "+ JSON.stringify(feed_ids));
    if (feed_ids.length >= Constants.MaxRunningJobs) {
      logger.info("Maximum jobs are locked for this machine, skipping...");
      _this.emptyRefreshCount = 1;
      _this.waitForFeeds();
    } else {
      var diff = Constants.MaxRunningJobs - feed_ids.length;

      if (diff <= 0) {
        return;
      }

      _this.dbHelper.Feed.findAll({ where: [" Feeds.id NOT IN (?) AND (Feeds.nextPull IS NULL OR Feeds.nextPull < NOW()) ", feed_ids], limit: 10, order: "nextPull ASC" }).success(function(feeds) {
        if (feeds.length == 0) {
          _this.emptyRefreshCount += 1;
          if (_this.emptyRefreshCount > Constants.FeedCheckIntervalMax) {
            _this.emptyRefreshCount = Constants.FeedCheckIntervalMax;
          }
        } else {
          _this.emptyRefreshCount = 1;
        }
        for (var i = 0; i < feeds.length; i++) {
          _this.redis.addFeedToQueue(feeds[i]);
        };

        _this.waitForFeeds();
      }).error(function(error){
        logger.info("Could not fetch new feeds: "+ error);
        _this.emptyRefreshCount = 1;
        _this.waitForFeeds();
      });
    }
  });
}

exports.WorkerManager = WorkerManager;
