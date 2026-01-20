import * as cheerio from 'cheerio';
import async from 'async';

import Forum from '../models/Forum.js';
import moment from 'moment';
import { request } from './service.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastPage = 0;

async function Run(callback) {
  const forum = await Forum.sort({}).findOne({ hasLink: false }).lean();

  const uri = forum.href;

  const html = await request(uri);

  const $ = cheerio.load(html);

  const link = $('.magnet-link').attr('href');
  console.log('link', link);

  if (link) {
    await Forum.updateOne({ _id: forum._id }, { $set: { hasLink: true, magnet_link: link } });
    callback();
  } else {
    callback();
  }
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
