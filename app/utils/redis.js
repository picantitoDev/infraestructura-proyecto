// utils/redis.js
const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379", // adapt for LXC IP later
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

// connect once at startup
(async () => {
  await redisClient.connect();
})();

const DEFAULT_EXPIRATION = 3600; // 1h

async function getOrSetCache(key, cb) {
  const cached = await redisClient.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const freshData = await cb();

  // 🚨 No cachear si es vacío
  if (
    freshData == null ||
    (Array.isArray(freshData) && freshData.length === 0)
  ) {
    return freshData;
  }

  await redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
  return freshData;
}


module.exports = { redisClient, getOrSetCache };
