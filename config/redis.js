const IORedis = require("ioredis");
require("dotenv").config();

const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB || 0),
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

const createRedisConnection = () => new IORedis(redisOptions);

module.exports = {
  createRedisConnection,
  redisOptions
};
