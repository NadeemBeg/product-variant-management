import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDb, disconnectDb } from "./db/connect.js";

async function main() {
  await connectDb(env.MONGO_URI);
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`PVMS API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down`);
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
