FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production runtime switched to Node to support dynamic Meta Injection
FROM node:20-alpine AS runner
WORKDIR /app

# Environment safety
ENV NODE_ENV=production
ENV API_BASE_URL=http://api-gateway:4003/api
ENV PUBLIC_API_URL=https://gts-api.slpro.in
ENV PUBLIC_WEB_URL=https://gtstore.slpro.in

# Copy production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Copy the built client dist AND the bootstrap bootstrap server 
COPY --from=build /app/dist ./dist
COPY server.js ./

EXPOSE 80
CMD ["node", "server.js"]
