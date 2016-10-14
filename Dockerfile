FROM node:latest

ENV YARN_VER=0.15.1

RUN npm install -g yarn@$YARN_VER && rm -rf ~/.npm

COPY ./src /app
COPY ./package.json /app/package.json
COPY ./yarn.lock /app/yarn.lock
WORKDIR /app

RUN yarn install && rm -rf ~/.yarn*
CMD ["npm","start"]