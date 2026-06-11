FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:20-bookworm-slim AS build

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY --from=dependencies /app/node_modules ./node_modules
RUN mkdir -p node_modules/lightningcss-linux-x64-gnu \
  && npm pack lightningcss-linux-x64-gnu@1.32.0 \
  && tar -xzf lightningcss-linux-x64-gnu-1.32.0.tgz -C node_modules/lightningcss-linux-x64-gnu --strip-components=1 \
  && mkdir -p node_modules/@tailwindcss/oxide-linux-x64-gnu \
  && npm pack @tailwindcss/oxide-linux-x64-gnu@4.3.0 \
  && tar -xzf tailwindcss-oxide-linux-x64-gnu-4.3.0.tgz -C node_modules/@tailwindcss/oxide-linux-x64-gnu --strip-components=1 \
  && rm lightningcss-linux-x64-gnu-1.32.0.tgz
COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/.next/standalone ./
COPY --chown=node:node --from=build /app/.next/static ./.next/static

EXPOSE 3001

USER node

CMD ["node", "server.js"]
