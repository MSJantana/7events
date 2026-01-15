FROM node:20-alpine

# Install dependencies needed for script execution and Prisma
RUN apk add --no-cache dos2unix openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

# Setup entrypoint script
COPY entrypoint.sh .
# Convert line endings to Unix format (LF) to avoid "exec format error" or "not found" issues, Make the script executable
RUN dos2unix entrypoint.sh && chmod +x entrypoint.sh

RUN npm run build

EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "start"]
