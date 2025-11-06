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
    console.log('API response:', data);
    if (data.error) throw new Error(data.error);

    displayCurrent(data);
    displayForecast(data.forecast);
    displayHourly(data.hourly);
    updateWeatherAnimations(data.condition);
  } catch (err) {
    console.error('Frontend error:', err.message);
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

  document.getElementById('weather-section').classList.remove('hidden');
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

  document.getElementById('forecast-section').classList.remove('hidden');
}

function displayHourly(list) {
  const container = document.getElementById('hourly-list');
  container.innerHTML = '';

  list.forEach(hour => {
    const card = document.createElement('div');
    card.className = 'hourly-card';
    card.innerHTML = `
      <p class="time">${hour.time}</p>
      <img src="https://openweathermap.org/img/wn/${hour.icon}.png" alt="${hour.condition}">
      <p class="temp">${hour.temp}°</p>
    `;
    container.appendChild(card);
  });

  document.getElementById('hourly-section').classList.remove('hidden');
}

function toggleUnit() {
  isCelsius = !isCelsius;
  tempToggle.textContent = isCelsius ? '°C' : '°F';

  const tempEl = document.getElementById('temperature');
  let current = parseInt(tempEl.textContent);

  if (isCelsius) {
    tempEl.textContent = Math.round((current - 32) * 5/9);
  } else {
    tempEl.textContent = Math.round(current * 9/5 + 32);
  }

  document.querySelectorAll('.forecast-card .temp').forEach(el => {
    let t = parseInt(el.textContent);
    el.textContent = isCelsius ? Math.round((t - 32) * 5/9) + '°' : Math.round(t * 9/5 + 32) + '°';
  });

  document.querySelectorAll('.hourly-card .temp').forEach(el => {
    let t = parseInt(el.textContent);
    el.textContent = isCelsius ? Math.round((t - 32) * 5/9) + '°' : Math.round(t * 9/5 + 32) + '°';
  });
}

function createParticles(condition, container) {
  console.log(`Creating particles for condition: ${condition}`);
  const numParticles = condition === 'Rain' || condition === 'Drizzle' ? 80 : 20;
  const particleClass = condition === 'Clouds' ? 'cloud' : 'rain';
  const duration = particleClass === 'cloud' ? 6000 : 700;

  for (let i = 0; i < numParticles; i++) {
    const particle = document.createElement('div');
    particle.className = `particle ${particleClass}`;
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * duration + 'ms';
    particle.style.animationDuration = (Math.random() * duration + duration) + 'ms';
    particle.style.opacity = Math.random() * 0.5 + 0.5;
    container.appendChild(particle);
  }
  console.log(`Added ${numParticles} ${particleClass} particles`);
}

function updateWeatherAnimations(condition) {
  console.log(`Updating animations for condition: ${condition}`);

  const existingParticles = document.querySelector('.weather-particles');
  if (existingParticles) {
    console.log('Removing existing particles');
    existingParticles.remove();
  }

  const weatherCard = document.getElementById('weather-card');
  const existingRays = weatherCard.querySelector('.sun-rays');
  if (existingRays) {
    console.log('Removing existing sun rays');
    existingRays.remove();
  }

  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'weather-particles';
  document.body.appendChild(particlesContainer);
  console.log('Created particles container');

  weatherCard.className = `weather-card ${condition.toLowerCase()}`;
  console.log(`Set weather-card class to: ${weatherCard.className}`);

  if (condition === 'Rain' || condition === 'Drizzle') {
    createParticles(condition, particlesContainer);
  } else if (condition === 'Clouds') {
    createParticles(condition, particlesContainer);
  } else if (condition === 'Clear') {
    const rays = document.createElement('div');
    rays.className = 'sun-rays';
    weatherCard.appendChild(rays);
    console.log('Added sun rays to weather card');
  } else {
    console.log(`No specific animation for condition: ${condition}`);
  }

  document.body.className = document.body.classList.contains('dark-mode') ? 'dark-mode' : '';
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
  console.log(`Set body class to: ${document.body.className}`);
}

function showLoading(yes) {
  document.getElementById('loading').classList.toggle('hidden', !yes);
}
function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearError() {
  document.getElementById('error').classList.add('hidden');
}
function hideWeather() {
  document.getElementById('weather-section').classList.add('hidden');
  document.getElementById('forecast-section').classList.add('hidden');
  document.getElementById('hourly-section').classList.add('hidden');
}
