function xmlDecode(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

function readTag(item, tag) {
  const match = item.match(new RegExp('<' + tag + '[^>]*>([\s\S]*?)</' + tag + '>', 'i'));
  return xmlDecode(match?.[1]?.trim() || '');
}

function parseRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 6).map(match => {
    const item = match[1];
    const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '';
    return { title: readTag(item, 'title'), url: readTag(item, 'link'), seendate: readTag(item, 'pubDate'), domain: xmlDecode(source), sourcecountry: 'News desk' };
  }).filter(article => article.title && article.url);
}

async function safeFetch(url, options = {}, timeoutMs = 2600) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); }
}

async function gdelt(query) {
  try {
    const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    url.search = new URLSearchParams({ query, mode: 'artlist', format: 'json', maxrecords: '6', sort: 'datedesc', timespan: '7d' });
    const response = await safeFetch(url, { headers: { 'user-agent': 'drift-weather-news/1.0' } });
    if (!response.ok) return [];
    return (await response.json()).articles || [];
  } catch { return []; }
}

async function googleNews(query) {
  try {
    const url = new URL('https://news.google.com/rss/search');
    url.search = new URLSearchParams({ q: query, hl: 'en-US', gl: 'US', ceid: 'US:en' });
    const response = await safeFetch(url, { headers: { 'user-agent': 'drift-weather-news/1.0' } });
    return response.ok ? parseRss(await response.text()) : [];
  } catch { return []; }
}

function liveSearch(place) {
  const topics = ['Latest weather stories near ', 'Weather alerts and updates for ', 'Forecast and climate coverage for '];
  return topics.map(prefix => {
    const title = prefix + place;
    return { title, url: 'https://news.google.com/search?q=' + encodeURIComponent(title) + '&hl=en-US&gl=US&ceid=US:en', seendate: new Date().toISOString(), domain: 'Google News', sourcecountry: 'Live search' };
  });
}

module.exports = async function handler(req, res) {
  const place = typeof req.query?.place === 'string' ? req.query.place.trim().slice(0, 80) : '';
  const query = place && place.toLowerCase() !== 'your location' ? '"' + place + '" weather' : 'weather OR climate OR storm';
  try {
    let articles = await gdelt(query);
    if (!articles.length) articles = await googleNews(query);
    const fallback = !articles.length;
    if (fallback) articles = liveSearch(place || 'your area');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ articles: articles.slice(0, 6), fallback });
  } catch { res.status(502).json({ articles: [], error: 'News feed unavailable' }); }
};
