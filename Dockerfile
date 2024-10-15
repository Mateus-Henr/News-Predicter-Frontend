# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /app

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install Google Chrome Stable and fonts
RUN apt-get update && apt-get install -y \
    chromium-browser \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    libgbm-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json of the main project
COPY package*.json ./

# Install main dependencies
RUN npm install

# Copy the entire project into the working directory
COPY . .

# Navigate to the correct directory for whatsapp-web.js and install dependencies
WORKDIR /app/src/whatsapp-web.js
COPY src/whatsapp-web.js ./
RUN npm install

# Navigate back to the main project directory
WORKDIR /app

RUN npm run build

# Expose the port your application runs on (adjust according to your app)
EXPOSE 3000

# Define the command to start your application (adjust this as needed)
CMD ["npm", "start"]
