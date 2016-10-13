FROM node:latest

RUN npm install -g yarn

COPY . /app
WORKDIR /app

RUN yarn
CMD ["npm","start"]