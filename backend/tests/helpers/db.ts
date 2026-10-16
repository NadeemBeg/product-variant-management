import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, disconnectDb } from "../../src/db/connect.js";

/**
 * Wires an ephemeral in-memory MongoDB to the suite that calls it. Collections
 * are cleared between tests so each case starts from a clean, known state.
 */
export function useTestDb(): void {
  let mem: MongoMemoryServer | undefined;

  beforeAll(async () => {
    // Generous launch timeout: cold starts under the test runner can exceed the
    // library's 10s default, especially on first run after the binary download.
    mem = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
    await connectDb(mem.getUri());
  }, 120_000);

  afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await disconnectDb();
    await mem?.stop();
  });
}
