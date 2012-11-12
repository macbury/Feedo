var cluster         = require('cluster');
var app             = require("./core/http_api");
var service         = require("./core/service");
var CONFIG          = require('config').development;
var DatabaseHelper  = require("./core/db").DatabaseHelper;
var WorkerManager   = require("./core/worker_manager").WorkerManager;
var fs              = require('fs');

var NumOfServers    = 1;

if ( cluster.isMaster ) {
  for ( var i=0; i<NumOfServers; ++i )
    cluster.fork();
} else {
  var dbHelper = new DatabaseHelper(CONFIG.db);
  app.startHttpServer(CONFIG, dbHelper);
}
