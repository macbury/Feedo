var Feed = require('./feed').Feed;

function getFeedsToSync() {
  var feed = new Feed();
}

exports.sync = function() {
  console.log('Staring sync, This process is pid ' + process.pid);
  setInterval(function(){
    getFeedsToSync();
  }, 30 * 1000)
}
