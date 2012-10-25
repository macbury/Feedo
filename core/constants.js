
var RedisConstants = {
  FeedLock: "feedoo:pendings"
}

exports.WorkerStatus = {
  Ready: "worker:ready"
}

// timeouts in seconds
exports.ImageDownloadTimeout    = 20;
exports.ItemDownloadTimeout     = 30;
exports.FeedDownloadTimeout     = 15;

exports.RefreshEvery		        = 10; //minutes to next feed refresh
exports.MaxRunningJobs          = 10;
exports.MaxRunningJobsPerWorker = 2;
exports.AskForNewFeeds          = 0.2;
exports.MaxFeedFetchErrorCount  = 5;

exports.RedisConstants          = RedisConstants;
exports.ImageMimeTypes          = ["image/png", "image/jpg", "image/jpeg", "image/gif"];
