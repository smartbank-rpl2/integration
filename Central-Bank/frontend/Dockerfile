FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

EXPOSE 5173

# Run the Vite development server exposed to host
CMD ["npm", "run", "dev"]
