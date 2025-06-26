#use the official Node.js image with alpine linux as the base image

FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# removes dev dependencies
# and installs only production dependencies
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD [ "node", "src/server.js" ]