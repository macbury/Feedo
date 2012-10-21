var Feed = require('./feed').Feed;

var dbHelper = null;

function getFeedsToSync() {
  console.log("Fetching feeds to sync");
  dbHelper.Feed.findAll().success(function(users) {
    for (var i = 0; i < feeds.length; i++) {
      new Feed(feeds[i]);
    };
  });
}

exports.sync = function(dbHelperTemp) {
  console.log('Staring sync, This process is pid ' + process.pid);
  dbHelper = dbHelperTemp;
  setInterval(function(){
    getFeedsToSync();
  }, 10 * 1000)
}
