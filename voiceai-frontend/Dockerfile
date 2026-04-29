FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S voiceai && adduser -S voiceai -G voiceai

COPY --from=builder /app/public ./public
COPY --from=builder --chown=voiceai:voiceai /app/.next/standalone ./
COPY --from=builder --chown=voiceai:voiceai /app/.next/static ./.next/static

USER voiceai
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
