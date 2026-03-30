# 1️⃣ Base image
FROM node:20-alpine

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Copy package files
COPY package.json package-lock.json ./

# 4️⃣ Install dependencies
RUN npm ci

# 5️⃣ Copy source code
COPY ./src ./src

# 6️⃣ Build TS (opcional si usas ts-node)
# RUN npm run build

# 7️⃣ Expose port
EXPOSE 3000

# 8️⃣ Default command: run server
CMD ["npx", "ts-node", "src/server.ts"]