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

  const trimmedInput = input.trim();
  const metaBlocks = [];
  const metaRegex = /\[([^\]]+)\]/g;

  let match;
  while ((match = metaRegex.exec(trimmedInput)) !== null) {
    metaBlocks.push(match[1]);
  }

  const mainContent = trimmedInput.replace(/\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
  const dashSplit = mainContent.split(/\s+[\-–—]\s+/);

  if (dashSplit.length >= 2) {
    result.author = [dashSplit[0].trim()].filter(Boolean);
    result.title = dashSplit.slice(1).join(' - ').trim() || null;
  } else {
    result.title = mainContent || null;
  }

  for (const metadataBlock of metaBlocks) {
    const parts = metadataBlock
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      const lower = part.toLowerCase();

      const yearMatch = part.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        result.year = Number.parseInt(yearMatch[0], 10);
        continue;
      }

      const qualityMatch = part.match(/(\d+)\s*kbps/i);
      if (qualityMatch) {
        result.quality = `${qualityMatch[1]} kbps`;
        continue;
      }

      const formatMatch = part.match(/\b(mp3|flac|wav|aac|ogg|lossless|m4b|m4a)\b/i);
      if (formatMatch) {
        result.format = formatMatch[1].toUpperCase();
        continue;
      }

      if (/^((читает|чтец)(?:\s|:|-|$)|narrator(?:\s|:|-|$)|read by(?:\s|:|-|$))/i.test(lower)) {
        const cleaned = part.replace(
          /^((читает|чтец)(?:\s|:|-|$)|narrator(?:\s|:|-|$)|read by(?:\s|:|-|$))\s*/i,
          ''
        );
        const narrators = cleaned
          .split(/[,+/&]|\sи\s/i)
          .map((a) => a.trim())
          .filter(Boolean);
        result.narrator = result.narrator.concat(narrators);
        continue;
      }

      result.tags.push(part);
    }
  }

  result.parsed = Boolean(result.title && result.author.length > 0);

  let parsedQuality = 0;
  if (result.title) parsedQuality += 25;
  if (result.author.length > 0) parsedQuality += 25;
  if (result.narrator.length > 0) parsedQuality += 25;
  result.parsedQuality = parsedQuality;

  return result;
}

function applyTrackMetadataToForumModel(forumModel) {
  const data = parseTrackMetadata(forumModel?.title);

  forumModel.author = data.author.join(', ');
  forumModel.narrator = data.narrator.join(', ');
  forumModel.year = data.year ? String(data.year) : '';
  forumModel.quality = data.quality || '';
  forumModel.format = data.format || '';
  forumModel.tags = data.tags.join(', ');
  forumModel.parsed = data.parsed;
  forumModel.parsedQuality = data.parsedQuality;

  return forumModel;
}

export { parseTrackMetadata, applyTrackMetadataToForumModel };
