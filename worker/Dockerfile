FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache ca-certificates openssl
RUN npm install

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .

CMD ["npx", "ts-node", "src/worker.ts"]
