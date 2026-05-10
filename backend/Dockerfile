FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend

COPY backend/ ./backend/

RUN npm run build --workspace=backend

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY backend/package.json ./
EXPOSE 4000
CMD ["node", "dist/index.js"]
