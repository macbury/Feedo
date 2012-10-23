var cluster         = require('cluster');
var app             = require("./core/http_api");
var service         = require("./core/service");
var CONFIG          = require('config').development;
var DatabaseHelper  = require("./core/db").DatabaseHelper;
var WorkerManager   = require("./core/worker_manager").WorkerManager;

if (cluster.isMaster) {
  var manager = new WorkerManager(CONFIG);
} else {
  var dbHelper = new DatabaseHelper(CONFIG.db);
  service.sync(dbHelper, CONFIG);
  app.startHttpServer(CONFIG, dbHelper);
}
