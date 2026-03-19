# ---- base ----
FROM node:20.19-slim AS base
RUN npm install -g firebase-tools@15.9.1
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- dev ----
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- production ----
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
