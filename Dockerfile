FROM node:17-alpine

MAINTAINER flozzone <flozzone@gmail.com>

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.build-date=$BUILD_DATE
LABEL org.label-schema.name="florinzz/flurly"
LABEL org.label-schema.description="NodeJS on K8s sample"
LABEL org.label-schema.url="github.com/flozzone/flurly"
LABEL org.label-schema.vcs-url="github.com/flozzone/flurly"

WORKDIR /home/node

# install dump-init to start with PID 1 and forward all signals to the app
RUN apk add dumb-init

# add all sources according to .dockerignore file
ADD . .

# install dependencies
RUN npm install

# this application exposes a HTTP webserver on port
EXPOSE 3000

# configure Docker to run health checks against our health endpoint
HEALTHCHECK --interval=5s --timeout=3s CMD curl --fail http://localhost:3000/health || exit 1

# instruct container to start with the following command
CMD ["dumb-init", "node", "server.js"]
