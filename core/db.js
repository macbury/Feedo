var Sequelize = require("sequelize");

function DatabaseHelper(config) {
  console.log("Connecting to db: ",JSON.stringify(config));
  this.db = new Sequelize(config.name, config.user, config.password, {
    host: config.host,
    port: 3306,
    protocol: null,
    //logging: console,
    maxConcurrentQueries: 100,
    dialect: 'mysql',
    define: { timestamps: true },
    sync: { force: true },
    pool: { maxConnections: 5, maxIdleTime: 30}
  });

  console.log("Appending schema");

  this.buildFeed();
}

DatabaseHelper.prototype.buildFeed = function() {
  this.Feed = this.db.define('Feed', {
    url: { type: Sequelize.STRING, allowNull: false, unique: true  },
    title: { type: Sequelize.STRING, allowNull: false },
    nextPull: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
  },{});
  this.Feed.sync();
}


exports.DatabaseHelper = DatabaseHelper;