const isHttpsUrl = value => typeof value === 'string' && /^https:\/\//i.test(value);

export function extractLomadeeShortUrl(body) {
  if (!body || typeof body !== 'object') return '';
  const candidates = [];
  const addRow = row => {
    if (!row || typeof row !== 'object') return;
    if (typeof row.shortUrl === 'string') candidates.push(row.shortUrl);
    if (Array.isArray(row.shortUrls)) candidates.push(...row.shortUrls);
  };

  if (Array.isArray(body)) {
    body.forEach(addRow);
  } else {
    addRow(body);
    if (body.data && !Array.isArray(body.data)) addRow(body.data);
    for (const key of ['data', 'items', 'products']) {
      if (Array.isArray(body[key])) body[key].forEach(addRow);
    }
  }
  return candidates.find(isHttpsUrl) || '';
}
