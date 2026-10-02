FROM node:22-alpine
WORKDIR /app
COPY server.mjs index.html motion-renderer.js logo-pavoneo.png rotulo-plano-02-opus.html CREATIVE_DIRECTION.md ./
ENV NODE_ENV=production PAVONEO_BIND_HOST=0.0.0.0 PAVONEO_PORT=4173
EXPOSE 4173
CMD ["node", "server.mjs"]
