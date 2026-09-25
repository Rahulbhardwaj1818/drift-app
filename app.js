const state = {
  unit: localStorage.getItem('drift-unit') || 'celsius',
  place: { name: 'San Francisco', latitude: 37.7749, longitude: -122.4194, admin1: 'California', country: 'United States' },
  weather: null,
  lastQuery: '',
  installPrompt: null,
  map: { instance: null, mode: 'radar', baseLayer: null, radarLayer: null, radarFrames: [], radarIndex: 0, radarTimer: null, marker: null },
  newsRequestId: 0
};

const els = {
  placeName: document.querySelector('#placeName'), placeMeta: document.querySelector('#placeMeta'), updatedText: document.querySelector('#updatedText'), loading: document.querySelector('#loadingState'), content: document.querySelector('#weatherContent'), error: document.querySelector('#errorState'), errorMessage: document.querySelector('#errorMessage'), retry: document.querySelector('#retryButton'), searchForm: document.querySelector('#searchForm'), searchInput: document.querySelector('#searchInput'), searchResults: document.querySelector('#searchResults'), currentDate: document.querySelector('#currentDate'), currentIcon: document.querySelector('#currentIcon'), currentTemp: document.querySelector('#currentTemp'), currentCondition: document.querySelector('#currentCondition'), feelsLike: document.querySelector('#feelsLike'), highLow: document.querySelector('#highLow'), sunrise: document.querySelector('#sunrise'), sunset: document.querySelector('#sunset'), sunPosition: document.querySelector('#sunPosition'), humidity: document.querySelector('#humidity'), wind: document.querySelector('#wind'), rainChance: document.querySelector('#rainChance'), visibility: document.querySelector('#visibility'), pressure: document.querySelector('#pressure'), uvIndex: document.querySelector('#uvIndex'), hourly: document.querySelector('#hourlyList'), forecast: document.querySelector('#forecastList'), map: document.querySelector('#weatherMap'), mapStatus: document.querySelector('#mapStatus'), mapFallback: document.querySelector('#mapFallback'), mapLocationLabel: document.querySelector('#mapLocationLabel'), radarTimeline: document.querySelector('#radarTimeline'), radarLegend: document.querySelector('#radarLegend'), radarRange: document.querySelector('#radarRange'), radarTime: document.querySelector('#radarTime'), radarStart: document.querySelector('#radarStart'), radarPlay: document.querySelector('#radarPlay'), recenterMap: document.querySelector('#recenterMap'), newsList: document.querySelector('#newsList'), newsStatus: document.querySelector('#newsStatus'), refreshNews: document.querySelector('#refreshNews')
};

const codeInfo = {
  0: ['Clear sky', 'clear'], 1: ['Mainly clear', 'clear'], 2: ['Partly cloudy', 'partly'], 3: ['Overcast', 'cloudy'], 45: ['Foggy', 'fog'], 48: ['Rime fog', 'fog'], 51: ['Light drizzle', 'drizzle'], 53: ['Drizzle', 'drizzle'], 55: ['Heavy drizzle', 'drizzle'], 56: ['Freezing drizzle', 'rain'], 57: ['Freezing drizzle', 'rain'], 61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'], 66: ['Freezing rain', 'rain'], 67: ['Freezing rain', 'rain'], 71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'], 77: ['Snow grains', 'snow'], 80: ['Rain showers', 'showers'], 81: ['Rain showers', 'showers'], 82: ['Heavy showers', 'showers'], 85: ['Snow showers', 'snow'], 86: ['Snow showers', 'snow'], 95: ['Thunderstorm', 'storm'], 96: ['Thunderstorm + hail', 'storm'], 99: ['Thunderstorm + hail', 'storm']
};

function getInfo(code) { return codeInfo[code] || ['Changing skies', 'partly']; }

function weatherIcon(type, isDay = true, className = '') {
  const color = type === 'clear' ? '#f7bd68' : type === 'snow' ? '#b9d8ff' : type === 'storm' ? '#b9a4ec' : '#89d9db';
  const sun = `<circle cx="36" cy="30" r="11" fill="${color}" opacity=".98"/><path d="M36 9v7M36 44v7M15 30h7M50 30h7M21.2 15.2l5 5M45.8 44.8l5 5M50.8 15.2l-5 5M26.2 44.8l-5 5" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  const moon = `<path d="M48.7 18.7a15.6 15.6 0 0 1-19.4-19.4 15.6 15.6 0 1 0 19.4 19.4Z" fill="${color}"/>`;
  const cloud = `<path d="M18 57h35.5c8.2 0 12.7-4.3 12.7-10.7 0-5.8-4.1-10.2-10-10.8A18.2 18.2 0 0 0 22.7 31c-7 0-12.2 5.3-12.2 12.5C10.5 50.7 13.3 57 18 57Z" fill="#9fb6cc" stroke="#d2e0eb" stroke-width="2"/>`;
  const drops = `<path d="m28 65-3 7M42 65l-3 7M56 65l-3 7" stroke="#74b9e6" stroke-width="3" stroke-linecap="round"/>`;
  const snow = `<path d="M28 65v9M23.5 69.5h9M24.8 66.3l6.4 6.4M31.2 66.3l-6.4 6.4M46 65v9M41.5 69.5h9M42.8 66.3l6.4 6.4M49.2 66.3l-6.4 6.4" stroke="#b9d8ff" stroke-width="2" stroke-linecap="round"/>`;
  const lightning = `<path d="m45 55-7 13h7l-4 10 12-16h-7l5-7Z" fill="#b9a4ec"/>`;
  let body = '';
  if (type === 'clear') body = isDay ? sun : moon;
  else if (type === 'partly') body = (isDay ? sun : moon) + cloud;
  else if (type === 'cloudy' || type === 'fog') body = cloud + (type === 'fog' ? `<path d="M20 66h34M16 73h35" stroke="#8fa9bf" stroke-width="2.5" stroke-linecap="round"/>` : '');
  else if (type === 'snow') body = cloud + snow;
  else if (type === 'storm') body = cloud + lightning;
  else body = cloud + drops;
  return `<svg class="${className}" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function celsiusToFahrenheit(value) { return value * 9 / 5 + 32; }
function displayTemp(value) { if (value === null || value === undefined || Number.isNaN(value)) return '--'; const converted = state.unit === 'fahrenheit' ? celsiusToFahrenheit(value) : value; return `${Math.round(converted)}°`; }
function unitLabel() { return state.unit === 'fahrenheit' ? 'F' : 'C'; }
function formatTime(iso, includeMinutes = true) { if (!iso) return '--:--'; return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: includeMinutes ? '2-digit' : undefined }).format(new Date(iso)); }
function formatDay(iso, options = { weekday: 'short' }) { return new Intl.DateTimeFormat(undefined, options).format(new Date(`${iso}T12:00:00`)); }
function todayLong(date = new Date()) { return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date); }
function windDirection(degrees) { const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; return dirs[Math.round(degrees / 45) % 8]; }
function uvLabel(value) { if (value < 3) return 'Low'; if (value < 6) return 'Moderate'; if (value < 8) return 'High'; if (value < 11) return 'Very high'; return 'Extreme'; }
function setText(el, text) { if (el) el.textContent = text; }

function renderPlace() {
  setText(els.placeName, state.place.name);
  const meta = [state.place.admin1, state.place.country].filter(Boolean).join(', ');
  setText(els.placeMeta, `${meta || 'Worldwide'} · Local time`);
}

function setLoading(loading) {
  els.loading.classList.toggle('is-hidden', !loading);
  els.content.classList.toggle('is-hidden', loading);
  els.error.classList.add('is-hidden');
}

function showError(message) {
  els.loading.classList.add('is-hidden'); els.content.classList.add('is-hidden'); els.error.classList.remove('is-hidden'); setText(els.errorMessage, message); setText(els.updatedText, 'Unable to update');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function safeArticleUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

function parseNewsDate(value) {
  const match = String(value ?? '').match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return new Date(value);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])));
}

function formatNewsDate(value) {
  const date = parseNewsDate(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function newsPlaceholder(message = 'No recent stories found') {
  return `<article class="news-card glass-card news-empty"><span class="news-empty-icon">✦</span><h4>${escapeHtml(message)}</h4><p>Try refreshing for the latest headlines around ${escapeHtml(state.place.name)}.</p></article>`;
}

function renderNews(articles, isFallback = false) {
  const cleanArticles = articles.filter(article => article?.title && article?.url).slice(0, 6);
  if (!cleanArticles.length) {
    els.newsList.innerHTML = newsPlaceholder();
    setText(els.newsStatus, 'No recent local stories');
    return;
  }
  els.newsList.innerHTML = cleanArticles.map((article, index) => {
    const title = escapeHtml(article.title);
    const url = safeArticleUrl(article.url);
    const domain = escapeHtml(article.domain || (() => { try { return new URL(article.url).hostname.replace(/^www\./, ''); } catch { return 'News desk'; } })());
    const source = escapeHtml(article.sourcecountry || 'Weather desk');
    return `<article class="news-card glass-card"><div class="news-card-top"><span class="news-category">${source}</span><span class="news-date">${formatNewsDate(article.seendate)}</span></div><h4><a href="${url}" target="_blank" rel="noreferrer">${title}</a></h4><div class="news-card-foot"><span>${domain}</span><span class="news-arrow">↗</span></div></article>`;
  }).join('');
  setText(els.newsStatus, isFallback ? 'Live search links' : `${cleanArticles.length} stories · just updated`);
}

async function loadNews() {
  if (!els.newsList) return;
  const requestId = ++state.newsRequestId;
  els.newsList.innerHTML = '<article class="news-card glass-card news-loading"><span class="news-loading-orb"></span><p>Scanning the latest headlines…</p></article>';
  setText(els.newsStatus, `Fetching ${state.place.name} headlines`);
  try {
    const response = await fetch(`/api/news?place=${encodeURIComponent(state.place.name)}`);
    if (!response.ok) throw new Error('News service unavailable');
    const data = await response.json();
    if (requestId !== state.newsRequestId) return;
    renderNews(data.articles || [], data.fallback === true);
  } catch {
    if (requestId !== state.newsRequestId) return;
    els.newsList.innerHTML = newsPlaceholder('Headlines are taking a moment');
    setText(els.newsStatus, 'News unavailable');
  }
}

function mapFrameTime(unixSeconds) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(unixSeconds * 1000));
}

function mapFrameDate(unixSeconds) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(unixSeconds * 1000));
}

function setMapFallback(show, message = 'Map data is taking a moment') {
  if (!els.mapFallback) return;
  els.mapFallback.classList.toggle('is-hidden', !show);
  const title = els.mapFallback.querySelector('strong');
  if (title) title.textContent = message;
}

function baseMapLayer(mode) {
  if (mode === 'satellite') {
    return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles &copy; Esri' });
  }
  return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' });
}

function initMap() {
  if (state.map.instance || !els.map) return;
  if (!window.L) { setMapFallback(true, 'Interactive maps are unavailable'); setText(els.mapStatus, 'Map unavailable'); return; }
  try {
    state.map.instance = L.map(els.map, { zoomControl: false, preferCanvas: true }).setView([state.place.latitude, state.place.longitude], 6);
    L.control.zoom({ position: 'bottomright' }).addTo(state.map.instance);
    state.map.baseLayer = baseMapLayer(state.map.mode).addTo(state.map.instance);
    state.map.marker = L.circleMarker([state.place.latitude, state.place.longitude], { radius: 7, color: '#f7bd68', weight: 3, fillColor: '#f7bd68', fillOpacity: .95 }).addTo(state.map.instance);
    updateMapLocation();
    loadRadar();
    setTimeout(() => state.map.instance?.invalidateSize(), 120);
  } catch {
    setMapFallback(true, 'Interactive maps are unavailable'); setText(els.mapStatus, 'Map unavailable');
  }
}

function updateMapLocation() {
  if (!state.map.instance) return;
  const coords = [state.place.latitude, state.place.longitude];
  state.map.instance.setView(coords, 6, { animate: true });
  if (state.map.marker) state.map.marker.setLatLng(coords).bindPopup(`<strong>${state.place.name}</strong><br><span>${[state.place.admin1, state.place.country].filter(Boolean).join(', ')}</span>`);
  setText(els.mapLocationLabel, state.place.name);
}

function renderRadarFrame(index) {
  const frames = state.map.radarFrames;
  if (!frames.length) return;
  state.map.radarIndex = Math.max(0, Math.min(index, frames.length - 1));
  const frame = frames[state.map.radarIndex];
  if (!state.map.radarLayer) {
    const tileUrl = `${state.map.radarHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
    state.map.radarLayer = L.tileLayer(tileUrl, { opacity: .74, maxZoom: 7, maxNativeZoom: 7, tileSize: 256, attribution: 'Weather data by <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>' });
  } else {
    state.map.radarLayer.setUrl(`${state.map.radarHost}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`);
  }
  if (state.map.mode === 'radar' && !state.map.instance.hasLayer(state.map.radarLayer)) state.map.radarLayer.addTo(state.map.instance);
  if (els.radarRange) els.radarRange.value = String(state.map.radarIndex);
  setText(els.radarTime, `${mapFrameDate(frame.time)} · ${state.map.radarIndex === frames.length - 1 ? 'latest' : 'past'}`);
  setText(els.radarStart, `${mapFrameTime(frames[0].time)} · ${frames.length} frames`);
}

async function loadRadar() {
  if (!state.map.instance || state.map.radarFrames.length) return;
  try {
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!response.ok) throw new Error('Radar feed unavailable');
    const data = await response.json();
    const frames = data.radar?.past || [];
    if (!frames.length || !data.host) throw new Error('No radar frames');
    state.map.radarHost = data.host;
    state.map.radarFrames = frames.slice(-13);
    els.radarRange.max = String(state.map.radarFrames.length - 1);
    setMapFallback(false);
    renderRadarFrame(state.map.radarFrames.length - 1);
    setText(els.mapStatus, 'Live radar');
  } catch {
    setText(els.mapStatus, 'Radar unavailable');
    setMapFallback(true, 'Radar data is unavailable right now');
  }
}

function setMapMode(mode) {
  if (!state.map.instance) return;
  state.map.mode = mode;
  document.querySelectorAll('.map-mode-button').forEach(button => button.classList.toggle('active', button.dataset.mapMode === mode));
  if (state.map.baseLayer) state.map.instance.removeLayer(state.map.baseLayer);
  state.map.baseLayer = baseMapLayer(mode).addTo(state.map.instance);
  const isRadar = mode === 'radar';
  els.radarTimeline.classList.toggle('is-hidden', !isRadar);
  els.radarLegend.classList.toggle('is-hidden', !isRadar);
  if (state.map.radarLayer) {
    if (isRadar) { renderRadarFrame(state.map.radarIndex); }
    else if (state.map.instance.hasLayer(state.map.radarLayer)) state.map.instance.removeLayer(state.map.radarLayer);
  }
  setText(els.mapStatus, isRadar ? (state.map.radarFrames.length ? 'Live radar' : 'Loading radar') : 'Satellite imagery');
  if (isRadar && !state.map.radarFrames.length) loadRadar();
  setTimeout(() => state.map.instance?.invalidateSize(), 80);
}

function toggleRadarPlayback() {
  if (!state.map.radarFrames.length) return;
  if (state.map.radarTimer) {
    clearInterval(state.map.radarTimer); state.map.radarTimer = null; updateRadarPlayButton(); return;
  }
  state.map.radarTimer = setInterval(() => {
    const next = state.map.radarIndex + 1;
    if (next >= state.map.radarFrames.length) { clearInterval(state.map.radarTimer); state.map.radarTimer = null; updateRadarPlayButton(); return; }
    renderRadarFrame(next);
  }, 850);
  updateRadarPlayButton();
}

function updateRadarPlayButton() {
  if (!els.radarPlay) return;
  const playing = Boolean(state.map.radarTimer);
  els.radarPlay.classList.toggle('is-playing', playing);
  els.radarPlay.querySelector('span').textContent = playing ? 'Pause' : 'Play';
  els.radarPlay.querySelector('svg').innerHTML = playing ? '<path d="M8 5v14M16 5v14"/>' : '<path d="m8 5 11 7-11 7V5Z"/>';
  els.radarPlay.setAttribute('aria-label', playing ? 'Pause radar timeline' : 'Play radar timeline');
}

async function fetchWeather(place = state.place) {
  state.place = place; renderPlace(); setLoading(true);
  const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, timezone: 'auto', forecast_days: '7', current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility', hourly: 'temperature_2m,precipitation_probability,weather_code', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max' });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error('The weather service returned an error.');
    state.weather = await response.json();
    renderWeather();
    localStorage.setItem('drift-place', JSON.stringify(state.place));
  } catch (error) {
    showError('Check your connection and try again. If the issue continues, search for the city once more.');
  }
}

function renderWeather() {
  const weather = state.weather; const current = weather.current; const daily = weather.daily;
  const info = getInfo(current.weather_code); const currentDate = new Date(current.time);
  setText(els.updatedText, `Updated ${formatTime(current.time)}`); setText(els.currentDate, todayLong(currentDate));
  els.currentIcon.innerHTML = weatherIcon(info[1], current.is_day === 1);
  setText(els.currentTemp, displayTemp(current.temperature_2m)); els.currentTemp.innerHTML = `${displayTemp(current.temperature_2m).replace('°', '')}<sup>°</sup>`;
  setText(els.currentCondition, info[0]); setText(els.feelsLike, displayTemp(current.apparent_temperature)); setText(els.highLow, `H ${displayTemp(daily.temperature_2m_max[0])} · L ${displayTemp(daily.temperature_2m_min[0])}`);
  setText(els.sunrise, formatTime(daily.sunrise[0])); setText(els.sunset, formatTime(daily.sunset[0]));
  const sunrise = new Date(daily.sunrise[0]).getTime(); const sunset = new Date(daily.sunset[0]).getTime(); const now = new Date(current.time).getTime(); const percent = Math.min(100, Math.max(0, ((now - sunrise) / (sunset - sunrise)) * 100)); els.sunPosition.style.left = `${Number.isFinite(percent) ? percent : 50}%`;
  setText(els.humidity, `${Math.round(current.relative_humidity_2m)}%`); setText(els.wind, `${Math.round(current.wind_speed_10m)} km/h ${windDirection(current.wind_direction_10m)}`); setText(els.rainChance, `${daily.precipitation_probability_max[0] ?? 0}%`); setText(els.visibility, `${(current.visibility / 1000).toFixed(1)} km`); setText(els.pressure, `${Math.round(current.surface_pressure)} hPa`); els.uvIndex.innerHTML = `${Math.round(daily.uv_index_max[0] ?? 0)} <em>${uvLabel(daily.uv_index_max[0] ?? 0)}</em>`;
  renderHourly(); renderDaily(); els.loading.classList.add('is-hidden'); els.error.classList.add('is-hidden'); els.content.classList.remove('is-hidden'); initMap(); updateMapLocation(); loadNews();
}

function renderHourly() {
  const { hourly, current } = state.weather; const currentHour = new Date(current.time).getTime(); let start = hourly.time.findIndex(time => new Date(time).getTime() >= currentHour); if (start < 0) start = 0;
  els.hourly.innerHTML = Array.from({ length: 10 }, (_, i) => { const index = start + i; const time = hourly.time[index]; const type = getInfo(hourly.weather_code[index])[1]; return `<div class="hour"><div class="hour-time">${i === 0 ? 'Now' : formatTime(time, false)}</div><div class="hour-icon">${weatherIcon(type, true)}</div><div class="hour-temp">${displayTemp(hourly.temperature_2m[index])}</div><div class="hour-rain">${hourly.precipitation_probability[index] ?? 0}% rain</div></div>`; }).join('');
}

function renderDaily() {
  const daily = state.weather.daily;
  els.forecast.innerHTML = daily.time.map((date, index) => { const type = getInfo(daily.weather_code[index])[1]; const name = index === 0 ? 'Today' : formatDay(date); return `<article class="forecast-day ${index === 0 ? 'today' : ''}"><div class="forecast-name">${name}</div><div class="forecast-icon">${weatherIcon(type, true)}</div><div class="forecast-temps"><span class="forecast-high">${displayTemp(daily.temperature_2m_max[index])}</span><span class="forecast-low">${displayTemp(daily.temperature_2m_min[index])}</span></div><div class="forecast-rain">${daily.precipitation_probability_max[index] ?? 0}% rain</div></article>`; }).join('');
}

async function searchPlaces(query) {
  if (query.length < 2) { els.searchResults.classList.remove('open'); return; }
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`); const data = await response.json();
    if (!data.results?.length) { els.searchResults.innerHTML = '<div class="result-item"><span class="result-place">No places found</span></div>'; els.searchResults.classList.add('open'); return; }
    els.searchResults.innerHTML = data.results.map((place, index) => `<button class="result-item" type="button" data-result-index="${index}"><span><span class="result-place">${place.name}</span><span class="result-country">${[place.admin1, place.country].filter(Boolean).join(', ')}</span></span><span>↗</span></button>`).join(''); els.searchResults.classList.add('open');
    els.searchResults.queryResults = data.results;
  } catch { els.searchResults.classList.remove('open'); }
}

function useLocation() {
  if (!navigator.geolocation) { showError('Location is not available in this browser. Search for a city instead.'); return; }
  setLoading(true); navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    let place = { name: 'Your location', latitude: coords.latitude, longitude: coords.longitude, admin1: '', country: '' };
    try { const reverse = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${coords.latitude}&longitude=${coords.longitude}&count=1&language=en&format=json`).then(r => r.json()); if (reverse.results?.[0]) { const found = reverse.results[0]; place = { ...place, name: found.name, admin1: found.admin1, country: found.country }; } } catch { /* Forecast still works with coordinates. */ }
    fetchWeather(place);
  }, () => showError('We couldn’t access your location. Search for a city instead.'), { enableHighAccuracy: false, timeout: 8000 });
}

els.searchForm.addEventListener('submit', event => { event.preventDefault(); const first = els.searchResults.queryResults?.[0]; if (first) selectPlace(first); else if (els.searchInput.value.trim()) searchPlaces(els.searchInput.value.trim()); });
els.searchInput.addEventListener('input', event => { state.lastQuery = event.target.value.trim(); clearTimeout(els.searchInput.searchTimer); els.searchInput.searchTimer = setTimeout(() => searchPlaces(state.lastQuery), 260); });
els.searchResults.addEventListener('click', event => { const item = event.target.closest('[data-result-index]'); if (item) selectPlace(els.searchResults.queryResults[Number(item.dataset.resultIndex)]); });
document.addEventListener('click', event => { if (!event.target.closest('.search-form')) els.searchResults.classList.remove('open'); });
document.querySelectorAll('.suggestion').forEach(button => button.addEventListener('click', () => { els.searchInput.value = button.dataset.city; searchPlaces(button.dataset.city); }));
document.querySelectorAll('.unit-button').forEach(button => button.addEventListener('click', () => { state.unit = button.dataset.unit; localStorage.setItem('drift-unit', state.unit); document.querySelectorAll('.unit-button').forEach(item => item.classList.toggle('active', item === button)); if (state.weather) renderWeather(); }));
document.querySelector('#locationButton').addEventListener('click', useLocation);
document.querySelector('#retryButton').addEventListener('click', () => fetchWeather(state.place));
document.querySelector('#scrollForecast').addEventListener('click', () => document.querySelector('#forecastSection').scrollIntoView({ behavior: 'smooth', block: 'start' }));
document.querySelector('#themeToggle').addEventListener('click', () => { document.body.classList.toggle('light-theme'); });
document.querySelectorAll('.map-mode-button').forEach(button => button.addEventListener('click', () => setMapMode(button.dataset.mapMode)));
els.radarRange.addEventListener('input', event => renderRadarFrame(Number(event.target.value)));
els.radarPlay.addEventListener('click', toggleRadarPlayback);
els.recenterMap.addEventListener('click', () => { updateMapLocation(); state.map.instance?.setZoom(6, { animate: true }); });
els.refreshNews.addEventListener('click', loadNews);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.installPrompt = event; if (els.installButton) els.installButton.hidden = false; });
window.addEventListener('appinstalled', () => { state.installPrompt = null; if (els.installButton) els.installButton.hidden = true; });
document.querySelector('#installButton')?.addEventListener('click', async () => { if (!state.installPrompt) return; state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; els.installButton.hidden = true; });

function selectPlace(place) { els.searchResults.classList.remove('open'); els.searchInput.value = ''; fetchWeather({ name: place.name, latitude: place.latitude, longitude: place.longitude, admin1: place.admin1, country: place.country }); }

try { const savedPlace = JSON.parse(localStorage.getItem('drift-place')); if (savedPlace?.latitude && savedPlace?.longitude) state.place = savedPlace; } catch { /* Ignore malformed local storage. */ }
document.querySelectorAll('.unit-button').forEach(button => button.classList.toggle('active', button.dataset.unit === state.unit));
fetchWeather(state.place);
