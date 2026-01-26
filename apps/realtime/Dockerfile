FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build || true
EXPOSE 4000
CMD ["node", "dist/main.js"]
