FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 6969

USER node

CMD ["sh", "-c", "npm run db:migrate && npm run start"]
