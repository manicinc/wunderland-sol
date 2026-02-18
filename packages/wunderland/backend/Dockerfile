# ---------- Stage 1: Build ----------
FROM node:18-alpine AS builder

# Create and set working directory
WORKDIR /app

# Install dependencies and build the application
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build


# ---------- Stage 2: Production ----------
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled output and other necessary files
COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/prompts ./prompts

# Set environment
ENV NODE_ENV=production
EXPOSE 3333

# Start the server
CMD ["node", "dist/server.js"]
