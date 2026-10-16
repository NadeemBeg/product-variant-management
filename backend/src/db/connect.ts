import mongoose from "mongoose";

/** Connect once; callers await this at boot. Index build is awaited so unique
 *  constraints are active before the first request. */
export async function connectDb(uri: string): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  await mongoose.syncIndexes();
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
