FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/
COPY database/ ./database/

# Non-root user for security
RUN addgroup -S voiceai && adduser -S voiceai -G voiceai
USER voiceai

EXPOSE 8080
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
