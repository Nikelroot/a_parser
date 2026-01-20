import * as cheerio from 'cheerio';

import Forum from '../models/Forum.js';
import moment from 'moment';
import { request } from './service.js';

const URLS = [
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
let lastPage = 0;

async function Run(cat, page = 0) {
  const uri = `https://rutracker.org/forum/viewforum.php?f=${cat}&start=${page * 50}`;

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

  console.log('length', items.length, cat, page, `of ${lastPage}`);
  if (page >= lastPage) {
    return false;
  } else {
    await delay(1000);
    return await Run(cat, page + 1);
  }
}

async function init() {
  for (const u of URLS) {
    await Run(u, 0).catch((e) => {
      console.error('ERR:', e?.message);
      if (e?.response) {
        console.error('STATUS:', e.response.status);
        console.error('HEADERS:', e.response.headers);
      }
    });
  }
  process.exit(0);
}

init();

async function create(item) {
  const { href, title, cat, date } = item;
  let forum = await Forum.findOne({ href }).lean();

  if (!forum) {
    forum = new Forum({ href });
    await forum.save();
  }

  await Forum.updateOne({ _id: forum._id }, { $set: { title, cat, date } });
}
