FROM node:18-alpine


WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3002

CMD [ "node", "src/server.js"]