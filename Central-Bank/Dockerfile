FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund

COPY nest-cli.json tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate \
  && npm run build \
  && npx tsc prisma/seed.ts \
    --outDir dist-seed \
    --module commonjs \
    --target ES2021 \
    --esModuleInterop \
    --skipLibCheck \
  && npm prune --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/dist-seed ./dist-seed
COPY --chown=node:node --from=build /app/prisma ./prisma

EXPOSE 3000

USER node

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist-seed/seed.js && exec node dist/main.js"]
