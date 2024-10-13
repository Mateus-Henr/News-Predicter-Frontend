# Use the official Node.js image as the base image
FROM node:18-slim

# Set the working directory
WORKDIR /usr/src/app

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Firefox and required libraries
RUN apt-get update && apt-get install -y gnupg wget curl firefox-esr --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Verify that Firefox is installed
RUN firefox --version

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies including Puppeteer
RUN npm install

# Bundle app source code
COPY . .

RUN npm run build

# Expose the port on which your app will run
EXPOSE 3000

# Start the application
CMD ["npm", "start"]