FROM node:20.11.0

WORKDIR /backend

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 9000

CMD ["./start.sh"]
