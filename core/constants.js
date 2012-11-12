
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

exports.FeedCheckIntervalMax    = 10; // Max seconds for next query to database for ask for next feeds to check

exports.MaxEmptyRefresh         = 144; // MaxEmptyRefresh * RefreshEvery = half day max for feed to next refesh
exports.RefreshEvery		        = 5; //minutes to next feed refresh
exports.MaxRunningJobs          = 5; // how many jobs canbe added to queue
exports.MaxRunningJobsPerWorker = 30;
exports.AskForNewFeeds          = 1;
exports.MaxFeedFetchErrorCount  = 5;

exports.RedisConstants          = RedisConstants;
exports.ImageMimeTypes          = ["image/png", "image/jpg", "image/jpeg", "image/gif"];
