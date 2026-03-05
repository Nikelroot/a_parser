import { log } from 'async';

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

function parseTrackMetadata(input) {
  const result = {
    title: null,
    author: [],
    narrator: [],
    year: null,
    quality: null,
    format: null,
    tags: [],
    parsed: false,
    parsedQuality: 0
  };
  if (!input || typeof input !== 'string') return result;
  let trimmedInput = input.trim();
  const metaBlocks = [];
  const metaRegex = /\[([^\]]+)\]/g;
  let match;
  while ((match = metaRegex.exec(trimmedInput)) !== null) {
    metaBlocks.push(match[1]);
  }
  let mainContent = trimmedInput.replace(/\[[^\]]+\]/g, '').trim();
  const dashSplit = mainContent.split(/\s*[-–]\s*/);
  if (dashSplit.length >= 2) {
    result.author = [dashSplit[0].trim()];
    result.title = dashSplit.slice(1).join(' - ').trim();
  } else {
    result.title = mainContent.trim();
  }
  for (const metadataBlock of metaBlocks) {
    const parts = metadataBlock.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (part.match(/^\d{4}/)) {
        const yearMatch = part.match(/(\d{4})/);
        if (yearMatch) {
          result.year = parseInt(yearMatch[1], 10);
        }
      } else if (part.toLowerCase().includes('kbps')) {
        const qualityMatch = part.match(/(\d+)\s*kbps/i);
        if (qualityMatch) {
          result.quality = qualityMatch[1] + ' kbps';
        }
      } else if (
        ['mp3', 'flac', 'wav', 'aac', 'ogg', 'lossless', 'm4b', 'm4a'].some((fmt) =>
          part.toLowerCase().includes(fmt)
        )
      ) {
        result.format = part.toUpperCase();
      } else if (part.startsWith('[') && part.endsWith(']')) {
        result.tags.push(part.slice(1, -1));
      } else {
        const narrators = part
          .split(/[,\+]/)
          .map((a) => a.trim())
          .filter(Boolean);
        result.narrator = result.narrator.concat(narrators);
      }
    }
  }
  result.parsed = !!(result.title && result.author.length > 0);
  let parsedQuality = 0;
  if (result.title) parsedQuality += 25;
  if (result.author.length > 0) parsedQuality += 25;
  if (result.narrator.length > 0) parsedQuality += 25;
  result.parsedQuality = parsedQuality;
  return result;
}

export { parseTrackMetadata };
