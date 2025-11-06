# Dockerfile
# Use official Node.js 18 slim image for a smaller footprint
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all application files
COPY . .

# Expose port 3000 (matches PORT in .env)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
