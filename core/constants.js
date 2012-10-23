
var RedisConstants = {
  FeedLock: "locked_feed_are"
}

exports.RefreshEvery		        = 10; //minutes to next feed refresh
exports.MaxRunningJobs          = 10;
exports.MaxRunningJobsPerWorker = 2;
exports.AskForNewFeeds          = 2;
exports.RedisConstants          = RedisConstants;
