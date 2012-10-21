var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var http    = require('http');
var app     = require("./core/http_api").app;
var service = require("./core/service");
if (cluster.isMaster) {
  for (var i = 0; i < numCPUs*2; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  service.sync();
  http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });
}
