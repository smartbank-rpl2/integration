FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

EXPOSE 6969

# Run local database schema alterations (migrations) and start Express server
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
