FROM node:20-alpine

WORKDIR /app

# Copy package configurations and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (development dependencies are required for building and seeding)
RUN npm install

# Copy application source code
COPY . .

# Generate Prisma Client and compile NestJS to JavaScript
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

# Execute database migrations/push, seed initial values, and run the compiled NestJS service
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run prisma:seed && node dist/main.js"]
