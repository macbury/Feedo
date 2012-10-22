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
  this.buildItem();
}

DatabaseHelper.prototype.buildFeed = function() {
  this.Feed = this.db.define('Feed', {
    url: { type: Sequelize.STRING, allowNull: false, unique: true  },
    title: { type: Sequelize.STRING, allowNull: false },
    nextPull: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    errorCount: { type: Sequelize.INTEGER, defaultValue: 0 },
    errorMessage: { type: Sequelize.TEXT },
  },{});
  this.Feed.sync();
}

DatabaseHelper.prototype.buildItem = function() {
  this.Item = this.db.define('Item', {
    url: { type: Sequelize.STRING, allowNull: false  },
    title: { type: Sequelize.STRING, allowNull: false },
    pubDate: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    body: { type: Sequelize.TEXT },
  },{});
  this.Feed.hasMany(this.Item);
  this.Item.belongsTo(this.Feed);
  this.Item.sync();
}


exports.DatabaseHelper = DatabaseHelper;