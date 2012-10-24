
var RedisConstants = {
  FeedLock: "feeds:pending"
}

exports.RefreshEvery		        = 10; //minutes to next feed refresh
exports.MaxRunningJobs          = 10;
exports.MaxRunningJobsPerWorker = 2;
exports.AskForNewFeeds          = 2;
exports.MaxFeedFetchErrorCount  = 5;
exports.RedisConstants          = RedisConstants;
