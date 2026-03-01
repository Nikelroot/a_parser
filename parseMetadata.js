import Forum from '../models/Forum.js';
import { applyTrackMetadataToForumModel } from './metadata.js';

async function run() {
  const cursor = Forum.find({}, { _id: 1, title: 1 }).lean().cursor();

  let processed = 0;
  let changed = 0;

  for await (const item of cursor) {
    processed += 1;

    const forumModel = { title: item.title ?? '' };
    applyTrackMetadataToForumModel(forumModel);

    const update = {
      title: forumModel.title,
      author: forumModel.author,
      narrator: forumModel.narrator,
      year: forumModel.year,
      quality: forumModel.quality,
      format: forumModel.format,
      tags: forumModel.tags,
      parsed: forumModel.parsed,
      parsedQuality: forumModel.parsedQuality
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
