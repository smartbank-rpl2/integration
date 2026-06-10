FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --no-audit --no-fund

COPY prisma ./prisma/
COPY . .

RUN rm -f *.tsbuildinfo && npx prisma generate && npm run build

EXPOSE 3000

USER node

CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && node dist/main.js"]
