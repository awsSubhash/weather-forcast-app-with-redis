const express = require('express');
const redis = require('redis');
const fetch = require('node-fetch');

const app = express();
require('dotenv').config();

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.on('error', err => console.error('Redis Error:', err));
redisClient.connect();

app.use(express.static('public'));

app.get('/weather', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.json({ error: 'City is required' });

  const cacheKey = `weather:${city.toLowerCase()}`;
  console.log(`Checking Redis cache for ${cacheKey}`);

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT for ${city}`);
      return res.json(JSON.parse(cached));
    }

    console.log(`Cache MISS for ${city} - fetching from API`);
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentUrl).then(res => res.json()),
      fetch(forecastUrl).then(res => res.json())
    ]);

    if (currentRes.cod !== 200) throw new Error(currentRes.message);
    if (forecastRes.cod !== '200') throw new Error(forecastRes.message);

    const now = new Date();
    const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    // Aggregate 5-day forecast by date
    const forecastMap = new Map();
    forecastRes.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString('en-US');
      if (!forecastMap.has(date) && new Date(item.dt * 1000) >= now && new Date(item.dt * 1000) <= fiveDaysLater) {
        forecastMap.set(date, {
          date,
          temp: Math.round(item.main.temp),
          condition: item.weather[0].main,
          icon: item.weather[0].icon
        });
      }
    });
    const forecast = Array.from(forecastMap.values()).slice(0, 5); // Limit to 5 days

    // Hourly data for 12:00 AM to 11:00 PM IST on the current day
    const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const startOfDayIST = new Date(nowIST.toISOString().split('T')[0] + 'T00:00:00+05:30'); // 12:00 AM IST
    const endOfDayIST = new Date(nowIST.toISOString().split('T')[0] + 'T23:00:00+05:30'); // 11:00 PM IST

    // Get all 3-hourly data for the current day
    const hourlyData = forecastRes.list
      .filter(item => {
        const date = new Date(item.dt * 1000);
        return date >= startOfDayIST && date <= endOfDayIST;
      })
      .sort((a, b) => a.dt - b.dt)
      .map(item => ({
        time: new Date(item.dt * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        }),
        temp: Math.round(item.main.temp),
        condition: item.weather[0].main,
        icon: item.weather[0].icon
      }));

    // Create a complete 24-hour array from 12:00 AM to 11:00 PM
    const hourly = [];
    for (let hour = 0; hour < 24; hour++) {
      const targetTime = new Date(startOfDayIST.getTime() + hour * 60 * 60 * 1000);
      const formattedTime = targetTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
      // Find the closest 3-hourly data point
      const closest = hourlyData.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(`2025-11-06 ${prev.time}`).getTime() - targetTime.getTime());
        const currDiff = Math.abs(new Date(`2025-11-06 ${curr.time}`).getTime() - targetTime.getTime());
        return prevDiff < currDiff ? prev : curr;
      }, hourlyData[0]) || hourlyData[0];
      hourly.push({
        time: formattedTime,
        temp: closest ? closest.temp : 0, // Default to 0 if no data, consider interpolation
        condition: closest ? closest.condition : 'Unknown',
        icon: closest ? closest.icon : '01d' // Default clear sky icon
      });
    }

    const result = {
      city: currentRes.name,
      country: currentRes.sys.country,
      temperature: Math.round(currentRes.main.temp),
      condition: currentRes.weather[0].main,
      description: currentRes.weather[0].description,
      icon: currentRes.weather[0].icon,
      humidity: currentRes.main.humidity,
      windSpeed: currentRes.wind.speed,
      pressure: currentRes.main.pressure,
      forecast,
      hourly
    };

    await redisClient.setEx(cacheKey, 600, JSON.stringify(result));
    console.log(`Cache MISS → stored ${city}`);
    res.json(result);
  } catch (err) {
    console.error('API error:', err.message);
    res.json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
