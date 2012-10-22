var cluster         = require('cluster');
var numCPUs         = require('os').cpus().length;
var http            = require('http');
var app             = require("./core/http_api").app;
var service         = require("./core/service");
var CONFIG          = require('config').development;
var DatabaseHelper  = require("./core/db").DatabaseHelper;

numCPUs = 1;

if (cluster.isMaster) {
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  var dbHelper = new DatabaseHelper(CONFIG.db);
  service.sync(dbHelper);
  http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });
}
