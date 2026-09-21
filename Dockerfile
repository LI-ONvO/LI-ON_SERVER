FROM node:22-slim

# prisma schema-engine 이 libssl 을 요구한다
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ponytail: devDependencies 를 그대로 둬서 시작 시 prisma migrate deploy 를 돌린다. 운영 이미지는 multi-stage + migrate 잡으로 분리
# prisma.config.ts · generated/ 를 함께 컴파일해서 진입점이 dist/main 이 아니라 dist/src/main 이다
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main"]
