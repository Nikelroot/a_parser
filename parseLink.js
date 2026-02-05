import * as cheerio from 'cheerio';
import async from 'async';

import Forum from '../models/Forum.js';
import moment from 'moment';
import { request } from './service.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastPage = 0;

async function Run(callback) {
  const forum = await Forum.findOne({ hasLink: false, magnet_try: { $lte: 3 } })
    .sort({ inLibrary: -1, lastParse: 1 })
    .lean();

  const uri = forum.href;

  const html = await request(uri);

  const $ = cheerio.load(html);

  const link = $('.magnet-link').attr('href');
  console.log('link', forum.title, link);

  if (link) {
    await Forum.updateOne(
      { _id: forum._id },
      {
        $set: { hasLink: true, magnet_link: link, lastParse: +new Date() },
        $inc: { magnet_try: 1 }
      }
    ).exec();
  } else {
    await Forum.updateOne(
      { _id: forum._id },
      {
        $inc: { magnet_try: 1 }
      }
    ).exec();
  }
  callback();
}

async function init() {
  async.forever(
    (next) => {
      setTimeout(() => {
        Run(next);
      }, 2000);
    },
    () => {
      process.exit(0);
    }
  );
}

init();
