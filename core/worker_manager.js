var cluster         = require('cluster');
var numCPUs         = require('os').cpus().length;
var DatabaseHelper  = require('./db').DatabaseHelper;
numCPUs = 1;

function WorkerManager(config) {
  var _this     = this;
  this.dbHelper = new DatabaseHelper(config.db);
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
}

exports.WorkerManager = WorkerManager;