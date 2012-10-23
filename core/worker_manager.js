var cluster         = require('cluster');
var numCPUs         = require('os').cpus().length;
var DatabaseHelper  = require('./db').DatabaseHelper;
var RedisQueue      = require('./redis_queue').RedisQueue;
var Constants       = require("./constants");
var RedisConstants  = require("./constants").RedisConstants;
//numCPUs = 1;

function WorkerManager(config) {
  var _this     = this;
  this.dbHelper = new DatabaseHelper(config.db);
  this.redis    = new RedisQueue(config.redis);

  this.dbHelper.sync().run().success(function(){
    _this.startWorkers(numCPUs);
  });

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
}

WorkerManager.prototype.startWorkers = function(num) {
  console.log("DB synced! Forking workers: ");
  for (var i = 0; i < num; i++) {
    var worker = cluster.fork();
    console.log('Staring ' + worker.process.pid);
  }
  this.waitForFeeds();
}

WorkerManager.prototype.waitForFeeds = function() {
  var _this = this;
  setTimeout(function(){
    _this.refreshQueue();
  }, 1000);
}

WorkerManager.prototype.refreshQueue = function(){
  var _this = this;
  this.redis.lockedFeeds(function(feed_ids) {
    console.log("Locked feeds: "+ JSON.stringify(feed_ids));
    if (feed_ids >= Constants.MaxRunningJobs) {
      console.log("Maximum jobs are locked for this machine, skipping...");
      _this.waitForFeeds();
      return;
    } else {
      var diff = Constants.MaxRunningJobs - feed_ids.length;

      if (diff <= 0) {
        return;
      }

      _this.dbHelper.Feed.findAll({ where: [" Feeds.id NOT IN (?) AND (Feeds.nextPull IS NULL OR Feeds.nextPull < NOW()) ", feed_ids], limit: 10, order: "nextPull ASC" }).success(function(feeds) {
        for (var i = 0; i < feeds.length; i++) {
          _this.redis.addFeedToQueue(feeds[i]);
        };

        _this.waitForFeeds();
      }).error(function(error){
        console.log("Could not fetch new feeds: "+ error);
        _this.waitForFeeds();
      });
    }
  });
}

exports.WorkerManager = WorkerManager;