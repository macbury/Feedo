
var RedisConstants = {
  FeedLock: "locked_feed_are"
}

exports.MaxRunningJobs          = 10;
exports.MaxRunningJobsPerWorker = 2;
exports.AskForNewFeeds          = 2;
exports.RedisConstants          = RedisConstants;