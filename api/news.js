function xmlDecode(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

function rssArticles(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 6).map(match => {
    const item = match[1];
    const read = tag => xmlDecode(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]?.trim() || '');
    const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '';
    return { title: read('title'), url: read('link'), seendate: read('pubDate'), domain: xmlDecode(source), sourcecountry: 'News desk' };
  }).filter(article => article.title && article.url);
}

async function fetchGdelt(query) {
  try {
    const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    url.search = new URLSearchParams({ query, mode: 'artlist', format: 'json', maxrecords: '6', sort: 'datedesc', timespan: '7d' });
    const response = await fetchWithTimeout(url, { headers: { 'user-agent': 'drift-weather-news/1.0' } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

async function fetchGoogleNews(query) {
  try {
    const url = new URL('https://news.google.com/rss/search');
    url.search = new URLSearchParams({ q: query, hl: 'en-US', gl: 'US', ceid: 'US:en' });
    const response = await fetchWithTimeout(url, { headers: { 'user-agent': 'drift-weather-news/1.0' } });
    if (!response.ok) return [];
    return rssArticles(await response.text());
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 2600) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function liveSearchArticles(place) {
  const topics = [
    `Latest weather stories near ${place}`,
    `Weather alerts and updates for ${place}`,
    `Forecast and climate coverage for ${place}`
  ];
  return topics.map(title => ({ title, url: `https://news.google.com/search?q=${encodeURIComponent(title)}&hl=en-US&gl=US&ceid=US:en`, seendate: new Date().toISOString(), domain: 'Google News', sourcecountry: 'Live search' }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const place = typeof req.query?.place === 'string' ? req.query.place.trim().slice(0, 80) : '';
  const query = place && place.toLowerCase() !== 'your location' ? `"${place}" weather` : 'weather OR climate OR storm';
  try {
    let articles = await fetchGdelt(query);
    if (!articles.length) articles = await fetchGoogleNews(query);
    const fallback = !articles.length;
    if (fallback) articles = liveSearchArticles(place || 'your area');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ articles: articles.slice(0, 6), fallback });
  } catch {
    res.status(502).json({ articles: [], error: 'News feed unavailable' });
  }
};
