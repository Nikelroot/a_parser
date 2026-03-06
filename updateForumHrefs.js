import mongoose from '../models/lib/mongoose.js';
import Forum from '../models/Forum.js';

const SOURCE_HOST = 'https://rutracker.org';
const TARGET_HOST = 'https://rutracker.net';
const BATCH_SIZE = 500;

async function run() {
  const cursor = Forum.find(
    { href: { $regex: /^https:\/\/rutracker\.org/ } },
    { _id: 1, href: 1 }
  )
    .lean()
    .cursor();

  let matchedCount = 0;
  let modifiedCount = 0;
  let operations = [];

  for await (const forum of cursor) {
    matchedCount += 1;
    operations.push({
      updateOne: {
        filter: { _id: forum._id },
        update: {
          $set: {
            href: forum.href.replace(SOURCE_HOST, TARGET_HOST)
          }
        }
      }
    });

    if (operations.length >= BATCH_SIZE) {
      const result = await Forum.bulkWrite(operations, { ordered: false });
      modifiedCount += result.modifiedCount;
      operations = [];
    }
  }

  if (operations.length > 0) {
    const result = await Forum.bulkWrite(operations, { ordered: false });
    modifiedCount += result.modifiedCount;
  }

  console.info(`[forum-hrefs] matched=${matchedCount} modified=${modifiedCount} from=${SOURCE_HOST} to=${TARGET_HOST}`);
}

run()
  .catch((error) => {
    console.error(`[forum-hrefs] failed: ${error?.stack || error?.message || error}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
