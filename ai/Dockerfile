FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests for layer caching
COPY package*.json ./
COPY ai/package.json ./ai/
COPY shared/package.json ./shared/

# Install workspace deps (hoisted to /app/node_modules)
RUN npm ci --workspace=ai --workspace=shared --include-workspace-root

# Copy source
COPY ai/ ./ai/
COPY shared/ ./shared/

# Build shared then ai
RUN npm run build --workspace=shared
RUN npm run build --workspace=ai

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Hoisted node_modules from workspace install
COPY --from=builder /app/node_modules ./node_modules
# Compiled output
COPY --from=builder /app/ai/dist ./dist
COPY ai/package.json ./package.json
EXPOSE 5000
CMD ["node", "dist/index.js"]
