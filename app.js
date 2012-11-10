var cluster         = require('cluster');
var app             = require("./core/http_api");
var service         = require("./core/service");
var CONFIG          = require('config').development;
var DatabaseHelper  = require("./core/db").DatabaseHelper;
var WorkerManager   = require("./core/worker_manager").WorkerManager;
var fs              = require('fs');
process.setMaxListeners(0);

/*var str = fs.createWriteStream(__dirname + '/log/shit.log', {
  encoding: 'utf8'
});
process.stdout.pipe(str);*/

if (cluster.isMaster) {
  var manager = new WorkerManager(CONFIG);
} else {
  var dbHelper = new DatabaseHelper(CONFIG.db);
  dbHelper.sync().run().success(function(){
    service.sync(dbHelper, CONFIG);
    app.startHttpServer(CONFIG, dbHelper);
  });

}
