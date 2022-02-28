FROM node:17-alpine

MAINTAINER flozzone <flozzone@gmail.com>

WORKDIR /home/node

# install dump-init to start with PID 1 and forward all signals to the app
RUN apk add dumb-init

ADD . .

RUN npm install

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s CMD curl --fail http://localhost:3000/health || exit 1

CMD ["dumb-init", "node", "server.js"]
