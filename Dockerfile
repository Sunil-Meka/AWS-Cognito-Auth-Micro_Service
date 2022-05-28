FROM node:16-alpine

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN yarn generate

COPY . .

RUN yarn build

EXPOSE 8080

CMD ["yarn", "start"]