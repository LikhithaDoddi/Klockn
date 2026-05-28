FROM node:20-alpine AS builder
WORKDIR /app

# Build shared package
COPY shared/package.json ./shared/
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/
RUN cd shared && npm install && npm run build

# Install backend deps (point @klockn/shared to local path)
COPY backend/package.json ./backend/
RUN cd backend && node -e "const p=require('./package.json'); p.dependencies['@klockn/shared']='file:../shared'; require('fs').writeFileSync('./package.json', JSON.stringify(p,null,2))"
RUN cd backend && npm install

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/
RUN cd backend && npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/shared/dist ./node_modules/@klockn/shared/dist
COPY --from=builder /app/shared/package.json ./node_modules/@klockn/shared/package.json
COPY backend/package.json ./
EXPOSE 4000
CMD ["node", "dist/index.js"]
