# ---- Base image ----
FROM node:20-alpine AS base

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies (no dev dependencies in production)
RUN npm ci --omit=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the app
COPY . .

# Expose the port (same as app.js)
EXPOSE 3000

# Environment
ENV NODE_ENV=production

# Start app
CMD npx prisma migrate deploy && npx prisma db seed && node app.js
