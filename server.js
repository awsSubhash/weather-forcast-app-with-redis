require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { createClient } = require('redis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Redis client
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on('error', err => console.log('Redis Error:', err));
redisClient.connect();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint
app.get('/weather', async (req, res) => {
  const city = req.query.city?.trim();
  if (!city) return res.status(400).json({ error: 'City is required' });

  const cacheKey = `weather:${city.toLowerCase()}`;

  try {
    // 1. Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT for ${city}`);
      return res.json(JSON.parse(cached));
    }

    // 2. Fetch from OpenWeatherMap
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;

    const [weatherRes, forecastRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(forecastUrl)
    ]);

    if (!weatherRes.ok) throw new Error('City not found');

    const weatherData = await weatherRes.json();
    const forecastData = await forecastRes.json();

    // Parse needed data
    const result = {
      city: weatherData.name,
      country: weatherData.sys.country,
      temperature: Math.round(weatherData.main.temp),
      condition: weatherData.weather[0].main,
      description: weatherData.weather[0].description,
      icon: weatherData.weather[0].icon,
      humidity: weatherData.main.humidity,
      windSpeed: weatherData.wind.speed,
      pressure: weatherData.main.pressure,
      forecast: forecastData.list
        .filter((_, i) => i % 8 === 0) // one per day
        .slice(0, 5)
        .map(item => ({
          date: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          temp: Math.round(item.main.temp),
          condition: item.weather[0].main,
          icon: item.weather[0].icon
        }))
    };

    // Cache for 10 minutes
    await redisClient.setEx(cacheKey, 600, JSON.stringify(result));
    console.log(`Cache MISS → stored ${city}`);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong' });
  }
});

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
