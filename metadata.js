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
  if (!input || typeof input !== 'string')
    return {
      title: null,
      author: null,
      narrator: null,
      year: null,
      quality: null,
      format: null,
      tags: [],
      parsed: false,
      parsedQuality: 0
    };
  let s = input.trim(),
    result = {
      title: null,
      author: null,
      narrator: null,
      year: null,
      quality: null,
      format: null,
      tags: [],
      parsed: false,
      parsedQuality: 0
    };
  let author = null,
    title = null,
    narrator = null,
    year = null,
    quality = null,
    format = null,
    tags = [];
  let confidence = 0;
  const metaMatch = s.match(/\[([^\]]+)\]\s*$/);
  let metaBlock = metaMatch ? metaMatch[1] : null;
  if (metaMatch) s = s.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
  const dashMatch = s.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    author = dashMatch[1].trim();
    title = dashMatch[2].trim();
    confidence += 25;
  } else {
    title = s.trim();
  }
  if (title) {
    const nMatch = title.match(
      /(?:читает|в исполнении|в записи|озвучение|voice|read by|чтец)\s*[:\s]+([^-[]+?)(?:\s*[-–—]|$)/i
    );
    if (nMatch) {
      narrator = nMatch[1].trim().replace(/[,\.\)]+$/, '');
      title = title.replace(nMatch[0], '').trim();
      confidence += 25;
    }
    const sMatch = title.match(/(?:серия|цикл|серии)\s*[:\s]+([^-[]+?)(?:\s*[-–—]|$)/i);
    if (sMatch) {
      const seriesText = sMatch[1].trim().replace(/[,\.\)]+$/, '');
      tags.push(
        ...seriesText
          .split(/[,\+]/)
          .map((t) => t.trim())
          .filter(Boolean)
      );
      title = title.replace(sMatch[0], '').trim();
    }
  }
  if (metaBlock) {
    const parts = metaBlock.split(',').map((p) => p.trim());
    parts.forEach((p) => {
      const yMatch = p.match(/^(\d{4})$/);
      if (yMatch) {
        year = parseInt(yMatch[1], 10);
        confidence += 25;
      }
      const qMatch = p.match(/(\d{2,3})\s*k?bps/i);
      if (qMatch) {
        quality = `${qMatch[1]} kbps`;
        confidence += parseInt(qMatch[1]);
      }
      const fMatch = p.match(/\b(mp3|flac|wav|aac|ogg|lossless|m4b|m4a)\b/i);
      if (fMatch) {
        format = fMatch[1].toUpperCase();
        confidence += 25;
      }
      if (!narrator && /чтец|читает|narrator|read by|voice/i.test(p)) {
        narrator = p.replace(/.*?(чтец|читает|narrator|read by|voice)[^:]*[:\s]+/i, '').trim();
        confidence += 25;
      }
    });
    if (!narrator && parts.length > 0) {
      const first = parts[0].trim();
      if (
        !/^\d{4}$/.test(first) &&
        !/\d{2,3}\s*k?bps/i.test(first) &&
        !['mp3', 'flac', 'wav', 'aac', 'ogg', 'lossless', 'm4b', 'm4a'].some((f) =>
          first.toLowerCase().includes(f)
        )
      ) {
        narrator = first;
        confidence += 25;
      }
    }
  }
  if (!author && title) {
    const parts = title.split(/\s*[-–—]\s*/);
    if (parts.length > 1) {
      author = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
      confidence += 25;
    }
  }
  if (!author) confidence -= 25;
  if (!title) confidence -= 25;
  if (!narrator) confidence -= 25;
  if (!year) confidence -= 25;
  result.author = author || null;
  result.title = title || null;
  result.narrator = narrator || null;
  result.year = year || null;
  result.quality = quality || null;
  result.format = format || null;
  result.tags = tags.length ? tags : [];
  result.parsedQuality = Math.max(0, Math.min(100, confidence));
  result.parsed = !!(author && title && narrator && year);
  return result;
}

export { parseTrackMetadata };
