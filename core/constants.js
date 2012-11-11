
var RedisConstants = {
  FeedLock: "feedoo:pendings:feeds"
}

exports.WorkerStatus = {
  Ready: "worker:ready"
}

// timeouts in seconds
exports.ImageDownloadTimeout    = 20;
exports.ItemDownloadTimeout     = 40;
exports.FeedDownloadTimeout     = 25;

exports.RefreshEvery		        = 30; //minutes to next feed refresh
exports.MaxRunningJobs          = 5; // how many jobs canbe added to queue
exports.MaxRunningJobsPerWorker = 30;
exports.AskForNewFeeds          = 1;
exports.MaxFeedFetchErrorCount  = 5;

exports.RedisConstants          = RedisConstants;
exports.ImageMimeTypes          = ["image/png", "image/jpg", "image/jpeg", "image/gif"];
