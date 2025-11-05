const cityInput = document.getElementById('city-input');
const getBtn = document.getElementById('get-weather');
const tempToggle = document.getElementById('temp-toggle');
const themeToggle = document.getElementById('theme-toggle');

let isCelsius = true;

getBtn.addEventListener('click', () => fetchWeather());
cityInput.addEventListener('keypress', e => e.key === 'Enter' && fetchWeather());
tempToggle.addEventListener('click', () => toggleUnit());
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
});

async function fetchWeather() {
  const city = cityInput.value.trim();
  if (!city) return showError('Please type a city name');

  showLoading(true);
  clearError();
  hideWeather();

  try {
    const res = await fetch(`/weather?city=${encodeURIComponent(city)}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    displayCurrent(data);
    displayForecast(data.forecast);
    updateBackground(data.condition);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

function displayCurrent(d) {
  document.getElementById('city-name').textContent = `${d.city}, ${d.country}`;
  document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${d.icon}@2x.png`;
  document.getElementById('temperature').textContent = d.temperature;
  document.getElementById('description').textContent = d.description;
  document.getElementById('humidity').textContent = d.humidity;
  document.getElementById('wind-speed').textContent = (d.windSpeed * 3.6).toFixed(1);
  document.getElementById('pressure').textContent = d.pressure;

  document.getElementById('weather-card').classList.remove('hidden');
}

function displayForecast(list) {
  const container = document.getElementById('forecast-list');
  container.innerHTML = '';

  list.forEach(day => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <p class="day">${day.date}</p>
      <img src="https://openweathermap.org/img/wn/${day.icon}.png" alt="${day.condition}">
      <p class="temp">${day.temp}°</p>
      <p class="cond">${day.condition}</p>
    `;
    container.appendChild(card);
  });

  document.getElementById('forecast').classList.remove('hidden');
}

function toggleUnit() {
  isCelsius = !isCelsius;
  tempToggle.textContent = isCelsius ? '°C' : '°F';

  const tempEl = document.getElementById('temperature');
  let current = parseInt(tempEl.textContent);

  if (isCelsius) {
    // F → C
    tempEl.textContent = Math.round((current - 32) * 5/9);
  } else {
    // C → F
    tempEl.textContent = Math.round(current * 9/5 + 32);
  }

  // Update forecast too
  document.querySelectorAll('.forecast-card .temp').forEach(el => {
    let t = parseInt(el.textContent);
    el.textContent = isCelsius ? Math.round((t - 32) * 5/9) + '°' : Math.round(t * 9/5 + 32) + '°';
  });
}

function updateBackground(condition) {
  document.body.className = '';
  const map = {
    Clear: 'sunny',
    Clouds: 'cloudy',
    Rain: 'rainy',
    Drizzle: 'rainy',
    Thunderstorm: 'rainy',
    Snow: 'cloudy',
    Mist: 'cloudy',
    Fog: 'cloudy'
  };
  const key = Object.keys(map).find(k => condition.includes(k)) || 'sunny';
  document.body.classList.add(map[key]);
}

// UI helpers
function showLoading(yes) {
  document.getElementById('loading').classList.toggle('hidden', !yes);
}
function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearError() { document.getElementById('error').classList.add('hidden'); }
function hideWeather() {
  document.getElementById('weather-card').classList.add('hidden');
  document.getElementById('forecast').classList.add('hidden');
}
