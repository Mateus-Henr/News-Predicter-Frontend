FROM node:latest

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