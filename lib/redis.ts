import { createClient, type RedisClientType } from "redis";

const globalForRedis = globalThis as typeof globalThis & {
  redisClient?: RedisClientType;
};

export function getLeaderboardKey(contestId: string) {
  return `contest:${contestId}:leaderboard`;
}

export async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;

  if (!globalForRedis.redisClient) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => {
      console.error("[redis] Client error:", error);
    });
    globalForRedis.redisClient = client as RedisClientType;
  }

  if (!globalForRedis.redisClient.isOpen) {
    await globalForRedis.redisClient.connect();
  }

  return globalForRedis.redisClient;
}
