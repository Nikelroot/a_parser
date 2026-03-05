import Forum from '../models/Forum.js';
import { parseTrackMetadata } from './metadata.js';

async function run() {
  const cursor = Forum.find({}, { _id: 1, title: 1 }).lean().cursor();

  let processed = 0;
  let changed = 0;

  for await (const item of cursor) {
    processed += 1;

    const data = parseTrackMetadata(item?.title);
    console.log('parseTrackMetadata', data);

    const update = {
      data,
      parsedQuality: data.parsedQuality
    };

    await Forum.updateOne({ _id: item._id }, { $set: update }).exec();
    changed += 1;

    if (processed % 500 === 0) {
      console.log(`[metadata] processed=${processed} updated=${changed}`);
    }
  }

  console.log(`[metadata] done processed=${processed} updated=${changed}`);
  process.exit(0);
}

run().catch((e) => {
  console.error('[metadata] error', e?.message || e);
  process.exit(1);
});
