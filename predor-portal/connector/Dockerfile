FROM node:22-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package.json ./
COPY index.js lib.js ./
COPY adapters ./adapters
RUN mkdir -p /data/inbox /data/archive && chown -R node:node /data
USER node
ENV NODE_ENV=production DATA_DIR=/data TZ=Europe/Budapest
VOLUME ["/data"]
# No EXPOSE: the connector only makes outbound HTTPS calls.
CMD ["node", "index.js"]
