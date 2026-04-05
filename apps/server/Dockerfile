FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app

# Copy package file and install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/
COPY server.js ./

# Expose port
EXPOSE 3001

# Start
CMD ["node", "server.js"]
