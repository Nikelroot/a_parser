import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

import Forum from '../models/Forum.js';
import moment from 'moment';
import { request } from './service.js';
import { applyTrackMetadataToForumModel } from './metadata.js';
import parserLogger from './logger/index.js';

process.on('unhandledRejection', (reason) => {
  parserLogger.error(`unhandled rejection: ${reason?.stack || reason?.message || reason}`);
});

process.on('uncaughtException', (error) => {
  parserLogger.error(`uncaught exception: ${error?.stack || error?.message || error}`);
  process.exit(1);
});

const URLS = [
  '1909',
  '574',
  '1036',
  '400',
  '2388',
  '2387',
  '661',
  '2348',
  '695',
  '399',
  '402',
  '467',
  '490',
  '499',
  '2137',
  '2127',
  '1350',
  '403',
  '1279',
  '716',
  '2165',
  '1501',
  '1580',
  '525',
  '2355',
  '2474',
  '2356',
  '2357'
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RESTART_DELAY_MS = 24 * 60 * 60 * 1000;
let lastPage = 0;

async function Run(cat, page = 0) {
  const uri = `https://rutracker.net/forum/viewforum.php?f=${cat}&start=${page * 50}`;

  const html = await request(uri);

  const $ = cheerio.load(html);

  if (page === 0) {
    const pageCount = $('.bottom_info .pg').eq(-2);
    lastPage = Number(pageCount.text());
  }

  const items = [];
  $('table.forum a.torTopic')
    .each((index, el) => {
      const a = $(el);
      let date = $(el).nextAll('td').last().text().trim();
      date = moment(date, 'YYYY-MM-DD HH:mm').toDate();

      const title = a.text().replace(/\s+/g, ' ').trim();
      const href = `https://rutracker.org/forum/${a.attr('href')}`;
      const i = { title, href, cat, date };
      items.push(i);
    })
    .get();

  for (const item of items) {
    await create(item);
  }

  parserLogger.info(
    `parsed category=${cat} page=${page} items=${items.length} lastPage=${lastPage}`
  );
  if (page >= lastPage) {
    return false;
  } else {
    await delay(1000);
    return await Run(cat, page + 1);
  }
}

async function runOnce() {
  for (const u of URLS) {
    await Run(u, 0).catch((e) => {
      parserLogger.error(`parse category=${u} failed: ${e?.message || e}`);
      if (e?.response) {
        parserLogger.error(
          `parse category=${u} response status=${e.response.status} headers=${JSON.stringify(e.response.headers)}`
        );
      }
    });
  }
}

async function start() {
  while (true) {
    parserLogger.info('parser iteration started');
    await runOnce();
    parserLogger.info(`parser iteration finished, next run in ${RESTART_DELAY_MS / (60 * 60 * 1000)}h`);
    await delay(RESTART_DELAY_MS);
  }
}

await start();

async function create(item) {
  const { href, title, cat, date } = item;
  let forum = await Forum.findOne({ href }).lean();

  if (!forum) {
    forum = new Forum({ href });
    await forum.save();
  }

  const forumModel = { title, cat, date };
  applyTrackMetadataToForumModel(forumModel);

  await Forum.updateOne({ _id: forum._id }, { $set: forumModel });
}
