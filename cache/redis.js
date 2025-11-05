const { createClient } = require('redis');

const client = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

client.on('error', err => console.log('Redis Error:', err));

module.exports = client;
