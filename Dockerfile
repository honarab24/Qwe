FROM ubuntu:22.04

# Install Node.js and shaka-packager
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs shaka-packager

# Copy files
WORKDIR /app
COPY . .

# Install npm dependencies
RUN npm install

# Expose the port
EXPOSE 10000

# Start the server
CMD ["node", "server.js"]
