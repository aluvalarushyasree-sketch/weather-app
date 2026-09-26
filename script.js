const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
let unit = "c"; // "c" | "f"
let lastData = null; // raw forecast payload, cached so unit toggle doesn't refetch
const el = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  locateBtn: document.getElementById("locate-btn"),
  suggestions: document.getElementById("suggestions"),
  unitBtns: document.querySelectorAll(".unit-btn"),

  stateLoading: document.getElementById("state-loading"),
  stateError: document.getElementById("state-error"),
  errorMessage: document.getElementById("error-message"),
  stateMain: document.getElementById("state-main"),

  locationName: document.getElementById("location-name"),
  updatedAt: document.getElementById("updated-at"),
  currentTemp: document.getElementById("current-temp"),
  currentUnit: document.getElementById("current-unit"),
  conditionLabel: document.getElementById("condition-label"),
  feelsLike: document.getElementById("feels-like"),
  conditionIcon: document.getElementById("condition-icon"),
  tempHigh: document.getElementById("temp-high"),
  tempLow: document.getElementById("temp-low"),

  windSpeed: document.getElementById("wind-speed"),
  windDir: document.getElementById("wind-dir"),
  humidity: document.getElementById("humidity"),
  pressure: document.getElementById("pressure"),
  uvIndex: document.getElementById("uv-index"),
  precip: document.getElementById("precip"),
  visibility: document.getElementById("visibility"),

  hourlyStrip: document.getElementById("hourly-strip"),
  forecastList: document.getElementById("forecast-list"),
  coords: document.getElementById("coords"),
};
const WEATHER_CODES = {
  0: { label: "Clear sky", group: "clear" },
  1: { label: "Mostly clear", group: "clear" },
  2: { label: "Partly cloudy", group: "cloudy" },
  3: { label: "Overcast", group: "cloudy" },
  45: { label: "Fog", group: "fog" },
  48: { label: "Depositing rime fog", group: "fog" },
  51: { label: "Light drizzle", group: "rain" },
  53: { label: "Drizzle", group: "rain" },
  55: { label: "Dense drizzle", group: "rain" },
  56: { label: "Freezing drizzle", group: "rain" },
  57: { label: "Dense freezing drizzle", group: "rain" },
  61: { label: "Slight rain", group: "rain" },
  63: { label: "Rain", group: "rain" },
  65: { label: "Heavy rain", group: "rain" },
  66: { label: "Freezing rain", group: "rain" },
  67: { label: "Heavy freezing rain", group: "rain" },
  71: { label: "Slight snow", group: "snow" },
  73: { label: "Snow", group: "snow" },
  75: { label: "Heavy snow", group: "snow" },
  77: { label: "Snow grains", group: "snow" },
  80: { label: "Slight showers", group: "rain" },
  81: { label: "Showers", group: "rain" },
  82: { label: "Violent showers", group: "rain" },
  85: { label: "Slight snow showers", group: "snow" },
  86: { label: "Heavy snow showers", group: "snow" },
  95: { label: "Thunderstorm", group: "storm" },
  96: { label: "Thunderstorm, slight hail", group: "storm" },
  99: { label: "Thunderstorm, heavy hail", group: "storm" },
};

function describeCode(code, isDay) {
  const entry = WEATHER_CODES[code] || { label: "Unknown", group: "cloudy" };
  let condition = entry.group;
  if (condition === "clear") condition = isDay ? "clear-day" : "clear-night";
  return { label: entry.label, condition };
}
const ICONS = {
  "clear-day": `<circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" stroke-width="4"/>
    <g stroke="currentColor" stroke-width="4" stroke-linecap="round">
      <line x1="50" y1="10" x2="50" y2="20"/><line x1="50" y1="80" x2="50" y2="90"/>
      <line x1="10" y1="50" x2="20" y2="50"/><line x1="80" y1="50" x2="90" y2="50"/>
      <line x1="22" y1="22" x2="29" y2="29"/><line x1="71" y1="71" x2="78" y2="78"/>
      <line x1="78" y1="22" x2="71" y2="29"/><line x1="29" y1="71" x2="22" y2="78"/>
    </g>`,
  "clear-night": `<path d="M65 25a28 28 0 1 0 10 40 22 22 0 0 1-10-40z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>`,
  cloudy: `<path d="M28 62a16 16 0 0 1 3-31 20 20 0 0 1 38-6 15 15 0 0 1 3 30z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>`,
  fog: `<g stroke="currentColor" stroke-width="4" stroke-linecap="round">
      <line x1="18" y1="40" x2="82" y2="40"/><line x1="14" y1="52" x2="86" y2="52"/>
      <line x1="22" y1="64" x2="78" y2="64"/>
    </g>`,
  rain: `<path d="M28 52a16 16 0 0 1 3-31 20 20 0 0 1 38-6 15 15 0 0 1 3 30z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <g stroke="currentColor" stroke-width="4" stroke-linecap="round">
      <line x1="35" y1="68" x2="30" y2="82"/><line x1="52" y1="68" x2="47" y2="82"/><line x1="69" y1="68" x2="64" y2="82"/>
    </g>`,
  storm: `<path d="M28 50a16 16 0 0 1 3-31 20 20 0 0 1 38-6 15 15 0 0 1 3 30z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <path d="M54 62 42 80h12l-8 16 22-24H56z" fill="currentColor"/>`,
  snow: `<path d="M28 50a16 16 0 0 1 3-31 20 20 0 0 1 38-6 15 15 0 0 1 3 30z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    <g stroke="currentColor" stroke-width="4" stroke-linecap="round">
      <line x1="35" y1="70" x2="35" y2="84"/><line x1="29" y1="77" x2="41" y2="77"/>
      <line x1="65" y1="70" x2="65" y2="84"/><line x1="59" y1="77" x2="71" y2="77"/>
    </g>`,
};

function iconMarkup(condition) {
  return ICONS[condition] || ICONS.cloudy;
}
function cToDisplay(celsius) {
  if (celsius === null || celsius === undefined) return "—";
  const v = unit === "c" ? celsius : celsius * 9 / 5 + 32;
  return Math.round(v);
}

function unitSuffix() {
  return unit === "c" ? "°C" : "°F";
}
function showState(state) {
  el.stateLoading.hidden = state !== "loading";
  el.stateError.hidden = state !== "error";
  el.stateMain.hidden = state !== "main";
}
async function searchCities(query) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed");
  const data = await res.json();
  return data.results || [];
}

function renderSuggestions(results) {
  if (!results.length) {
    el.suggestions.hidden = true;
    el.suggestions.innerHTML = "";
    return;
  }
  el.suggestions.innerHTML = results
    .map((r, i) => {
      const region = [r.admin1, r.country].filter(Boolean).join(", ");
      return `<button type="button" class="suggestion-item" data-index="${i}">${r.name} <span>${region}</span></button>`;
    })
    .join("");
  el.suggestions.hidden = false;

  el.suggestions.querySelectorAll(".suggestion-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const r = results[Number(btn.dataset.index)];
      el.suggestions.hidden = true;
      el.searchInput.value = r.name;
      loadWeather(r.latitude, r.longitude, formatPlaceName(r));
    });
  });
}

function formatPlaceName(r) {
  return [r.name, r.admin1, r.country].filter(Boolean).join(", ");
}

let searchDebounce;
el.searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const q = el.searchInput.value.trim();
  if (q.length < 2) {
    el.suggestions.hidden = true;
    return;
  }
  searchDebounce = setTimeout(async () => {
    try {
      const results = await searchCities(q);
      renderSuggestions(results);
    } catch {
      el.suggestions.hidden = true;
    }
  }, 300);
});

document.addEventListener("click", (e) => {
  if (!el.suggestions.contains(e.target) && e.target !== el.searchInput) {
    el.suggestions.hidden = true;
  }
});

el.searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = el.searchInput.value.trim();
  if (!q) return;
  showState("loading");
  try {
    const results = await searchCities(q);
    if (!results.length) {
      el.errorMessage.textContent = `Couldn't find "${q}". Try a different spelling or a nearby larger city.`;
      showState("error");
      return;
    }
    const r = results[0];
    el.suggestions.hidden = true;
    await loadWeather(r.latitude, r.longitude, formatPlaceName(r));
  } catch {
    el.errorMessage.textContent = "Something went wrong reaching the weather service. Please try again.";
    showState("error");
  }
});
el.locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    el.errorMessage.textContent = "Location isn't available in this browser.";
    showState("error");
    return;
  }
  showState("loading");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      let placeName = "Your location";
      try {
        const res = await fetch(`${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        if (res.ok) {
          const data = await res.json();
          placeName = [data.city || data.locality, data.principalSubdivision, data.countryName]
            .filter(Boolean)
            .join(", ") || placeName;
        }
      } catch {
        /* reverse geocoding is a nice-to-have; fall back silently */
      }
      loadWeather(latitude, longitude, placeName);
    },
    () => {
      el.errorMessage.textContent = "Location access was denied. You can search for a city instead.";
      showState("error");
    }
  );
});


async function loadWeather(lat, lon, placeName) {
  showState("loading");
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,is_day,visibility,precipitation_probability",
      hourly: "temperature_2m,weather_code,is_day,precipitation_probability",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "7",
    });
    const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
    if (!res.ok) throw new Error("Forecast request failed");
    const data = await res.json();
    lastData = { data, placeName, lat, lon };
    render(lastData);
    showState("main");
  } catch {
    el.errorMessage.textContent = "Couldn't load the forecast right now. Please try again.";
    showState("error");
  }
}


function render({ data, placeName, lat, lon }) {
  const cur = data.current;
  const { label, condition } = describeCode(cur.weather_code, cur.is_day === 1);

  document.body.dataset.condition = condition;

  el.locationName.textContent = placeName;
  el.updatedAt.textContent = `Updated ${new Date(cur.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  el.currentTemp.textContent = cToDisplay(cur.temperature_2m);
  el.currentUnit.textContent = unitSuffix();
  el.conditionLabel.textContent = label;
  el.feelsLike.textContent = `Feels like ${cToDisplay(cur.apparent_temperature)}${unitSuffix()}`;
  el.conditionIcon.innerHTML = iconMarkup(condition);

  const today = data.daily;
  el.tempHigh.textContent = `${cToDisplay(today.temperature_2m_max[0])}${unitSuffix()}`;
  el.tempLow.textContent = `${cToDisplay(today.temperature_2m_min[0])}${unitSuffix()}`;

  el.windSpeed.textContent = Math.round(cur.wind_speed_10m);
  el.windDir.textContent = compassDirection(cur.wind_direction_10m);
  el.humidity.textContent = Math.round(cur.relative_humidity_2m);
  el.pressure.textContent = Math.round(cur.pressure_msl);
  el.uvIndex.textContent = today.uv_index_max[0] != null ? today.uv_index_max[0].toFixed(1) : "—";
  el.precip.textContent = cur.precipitation_probability ?? 0;
  el.visibility.textContent = cur.visibility != null ? (cur.visibility / 1000).toFixed(1) : "—";

  el.coords.textContent = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

  renderHourly(data.hourly, cur.time);
  renderForecast(data.daily);
}

function compassDirection(deg) {
  if (deg == null) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function renderHourly(hourly, currentTimeIso) {
  const startIndex = hourly.time.findIndex((t) => t >= currentTimeIso);
  const from = startIndex === -1 ? 0 : startIndex;
  const slice = from + 24 <= hourly.time.length ? [from, from + 24] : [from, hourly.time.length];

  const items = [];
  for (let i = slice[0]; i < slice[1]; i++) {
    const time = new Date(hourly.time[i]);
    const { condition } = describeCode(hourly.weather_code[i], hourly.is_day[i] === 1);
    items.push(`
      <div class="hour-item">
        <p class="hour-time">${i === from ? "Now" : time.toLocaleTimeString([], { hour: "numeric" })}</p>
        <svg class="hour-icon" viewBox="0 0 100 100">${iconMarkup(condition)}</svg>
        <p class="hour-temp">${cToDisplay(hourly.temperature_2m[i])}°</p>
      </div>
    `);
  }
  el.hourlyStrip.innerHTML = items.join("");
}

function renderForecast(daily) {
  const overallMax = Math.max(...daily.temperature_2m_max);
  const overallMin = Math.min(...daily.temperature_2m_min);
  const span = Math.max(overallMax - overallMin, 1);

  const rows = daily.time.map((dateStr, i) => {
    const date = new Date(dateStr + "T00:00:00");
    const dayLabel = i === 0 ? "Today" : date.toLocaleDateString([], { weekday: "short" });
    const { label, condition } = describeCode(daily.weather_code[i], true);
    const hi = daily.temperature_2m_max[i];
    const lo = daily.temperature_2m_min[i];
    const leftPct = ((lo - overallMin) / span) * 100;
    const widthPct = ((hi - lo) / span) * 100;

    return `
      <div class="forecast-row">
        <span class="forecast-day">${dayLabel}</span>
        <span class="forecast-cond">
          <svg class="forecast-icon" viewBox="0 0 100 100" style="vertical-align:middle; margin-right:6px;">${iconMarkup(condition)}</svg>
          ${label}
        </span>
        <span></span>
        <span class="forecast-range">
          <span class="range-low">${cToDisplay(lo)}°</span>
          <span class="range-bar"><span class="range-fill" style="left:${leftPct}%; width:${widthPct}%;"></span></span>
          <span>${cToDisplay(hi)}°</span>
        </span>
      </div>
    `;
  });
  el.forecastList.innerHTML = rows.join("");
}


el.unitBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    unit = btn.dataset.unit;
    el.unitBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
    if (lastData) render(lastData);
  });
});

loadWeather(28.6139, 77.2090, "New Delhi, India");