FROM node:17

MAINTAINER flozzone <flozzone@gmail.com>

WORKDIR /home/node

ADD . .

RUN npm install

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s CMD curl --fail http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
