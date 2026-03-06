import Forum from '../models/Forum.js';
import { applyTrackMetadataToForumModel } from './metadata.js';
import axios from 'axios';
import metadataLogger from './logger/metadataLogger.js';

process.on('unhandledRejection', (reason) => {
  metadataLogger.error(`unhandled rejection: ${reason?.stack || reason?.message || reason}`);
});

process.on('uncaughtException', (error) => {
  metadataLogger.error(`uncaught exception: ${error?.stack || error?.message || error}`);
  process.exit(1);
});

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 45000);

async function run() {
  const cursor = Forum.find({}, { _id: 1, title: 1 }).lean().cursor();

  let processed = 0;
  let changed = 0;

  for await (const item of cursor) {
    processed += 1;

    const { title, ...metadataUpdate } = applyTrackMetadataToForumModel({
      title: item?.title || ''
    });

    const res = await Forum.updateOne({ _id: item._id }, { $set: metadataUpdate }).exec();
    changed += res?.modifiedCount || 0;

    if (processed % 500 === 0) {
      metadataLogger.info(`[metadata] processed=${processed} updated=${changed}`);
    }
  }

  metadataLogger.info(`[metadata] done processed=${processed} updated=${changed}`);
  await enrichLowQualityWithOllama();
}

function buildOllamaPrompt(title) {
  return [
    'Extract audiobook metadata from title.',
    'Return ONLY valid JSON object with keys:',
    'author (string), narrator (string), year (string), quality (string), format (string), tags (string), parsed (boolean), parsedQuality (number 0..100).',
    'If value is unknown, return empty string (or false for parsed).',
    'Input title:',
    title
  ].join('\n');
}

function normalizeOllamaMetadata(data) {
  if (!data || typeof data !== 'object') return null;

  const out = {
    author: typeof data.author === 'string' ? data.author.trim() : '',
    narrator: typeof data.narrator === 'string' ? data.narrator.trim() : '',
    year: typeof data.year === 'string' ? data.year.trim() : '',
    quality: typeof data.quality === 'string' ? data.quality.trim() : '',
    format: typeof data.format === 'string' ? data.format.trim() : '',
    tags: typeof data.tags === 'string' ? data.tags.trim() : '',
    parsed: Boolean(data.parsed),
    parsedQuality: Number(data.parsedQuality) || 0
  };

  if (out.parsedQuality < 0) out.parsedQuality = 0;
  if (out.parsedQuality > 100) out.parsedQuality = 100;

  return out;
}

async function parseMetadataWithOllama(title) {
  const headers = { 'Content-Type': 'application/json' };
  if (OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${OLLAMA_API_KEY}`;
  }

  const response = await axios.post(
    `${OLLAMA_URL.replace(/\/$/, '')}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt: buildOllamaPrompt(title),
      stream: false,
      format: 'json'
    },
    {
      timeout: OLLAMA_TIMEOUT_MS,
      headers
    }
  );

  const raw = response?.data?.response;
  if (!raw || typeof raw !== 'string') return null;

  try {
    return normalizeOllamaMetadata(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function enrichLowQualityWithOllama() {
  if (!OLLAMA_URL || !OLLAMA_MODEL) {
    metadataLogger.warn('[metadata][ollama] skipped: set OLLAMA_URL and OLLAMA_MODEL');
    return;
  }

  const cursor = Forum.find({ parsedQuality: { $lt: 75 } }, { _id: 1, title: 1, parsedQuality: 1 })
    .lean()
    .cursor();

  let processed = 0;
  let updated = 0;
  let failed = 0;

  for await (const item of cursor) {
    processed += 1;

    try {
      const metadata = await parseMetadataWithOllama(item?.title || '');
      if (!metadata) {
        failed += 1;
        continue;
      }

      const res = await Forum.updateOne({ _id: item._id }, { $set: metadata }).exec();
      updated += res?.modifiedCount || 0;
    } catch (e) {
      failed += 1;
      metadataLogger.error(
        `[metadata][ollama] error id=${item?._id?.toString?.() || item?._id}: ${e?.stack || e?.message || e}`
      );
    }

    if (processed % 100 === 0) {
      metadataLogger.info(
        `[metadata][ollama] processed=${processed} updated=${updated} failed=${failed}`
      );
    }
  }

  metadataLogger.info(
    `[metadata][ollama] done processed=${processed} updated=${updated} failed=${failed}`
  );
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    metadataLogger.error(`[metadata] error ${e?.stack || e?.message || e}`);
    process.exit(1);
  });
