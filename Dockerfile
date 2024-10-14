# Use the official Node.js image as the base image
FROM node:18-slim

# Set the working directory
WORKDIR /usr/src/app

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install gnupg wget -y && \
    wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install google-chrome-stable -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Verify that Chrome is installed at the expected location
RUN ls -alh /usr/bin/google-chrome-stable && \
    /usr/bin/google-chrome-stable --version

# Copy package.json and package-lock.json for the main app
COPY package*.json ./

# Install main app dependencies
RUN npm install

# Copy the entire `src/whatsapp-web.js` directory, including JS code
COPY src/whatsapp-web.js /usr/src/app/src/whatsapp-web.js

# Navigate to whatsapp-web.js directory
WORKDIR /usr/src/app/src/whatsapp-web.js

# Install whatsapp-web.js dependencies
RUN npm install

# Return to the main app directory
WORKDIR /usr/src/app

# Copy the rest of the app source code
COPY . .

# Build the app (if applicable, adjust if no build step is needed)
RUN npm run build

# Expose the port on which your app will run
EXPOSE 3000

# Start the application
CMD ["npm", "start"]