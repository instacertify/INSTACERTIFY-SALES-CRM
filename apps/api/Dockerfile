FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
RUN npm install --workspace=@instacertify/api --workspace=@instacertify/database --include-workspace-root=false || npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run generate -w @instacertify/database && npm run build -w @instacertify/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database ./packages/database
EXPOSE 4000
CMD ["node", "dist/main.js"]
