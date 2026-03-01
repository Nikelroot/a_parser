const EMPTY_METADATA = {
  title: '',
  author: '',
  narrator: '',
  year: '',
  quality: '',
  format: '',
  tags: '',
  parsed: false,
  parsedQuality: 0
};

function parseTrackMetadataFields(str = '') {
  const items = String(str)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const result = { ...EMPTY_METADATA };

  for (const item of items) {
    if (item.startsWith('title:')) result.title = item.slice(6).trim();
    else if (item.startsWith('author:')) result.author = item.slice(7).trim();
    else if (item.startsWith('narrator:')) result.narrator = item.slice(9).trim();
    else if (item.startsWith('year:')) result.year = item.slice(5).trim();
    else if (item.startsWith('quality:')) result.quality = item.slice(8).trim();
    else if (item.startsWith('format:')) result.format = item.slice(7).trim();
    else if (item.startsWith('tags:')) result.tags = item.slice(5).trim();
    else if (item.startsWith('parsed:')) result.parsed = item.slice(7).trim() === 'true';
    else if (item.startsWith('parsedQuality:')) {
      result.parsedQuality = parseInt(item.slice(14).trim(), 10) || 0;
    }
  }

  if (result.author && result.title && result.narrator && result.year) {
    result.parsed = true;
  }
  if (!result.parsedQuality && result.parsed) {
    result.parsedQuality = 100;
  }

  return result;
}

export function parseTrackMetadata(str) {
  const result = parseTrackMetadataFields(str);
  return `title:${result.title},author:${result.author},narrator:${result.narrator},year:${result.year},quality:${result.quality},format:${result.format},tags:${result.tags},parsed:${result.parsed},parsedQuality:${result.parsedQuality}`;
}

export function applyTrackMetadataToForumModel(forumItem) {
  const originalTitle = forumItem?.title ?? '';
  const metadata = parseTrackMetadataFields(originalTitle);

  forumItem.title = metadata.title || originalTitle;
  forumItem.author = metadata.author;
  forumItem.narrator = metadata.narrator;
  forumItem.year = metadata.year;
  forumItem.quality = metadata.quality;
  forumItem.format = metadata.format;
  forumItem.tags = metadata.tags;
  forumItem.parsed = metadata.parsed;
  forumItem.parsedQuality = metadata.parsedQuality;

  return forumItem;
}
