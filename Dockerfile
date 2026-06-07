FROM node:25-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:25-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 4000
CMD ["npm", "start"]
