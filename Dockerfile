FROM node:14.16.1

#App Dir
WORKDIR /app

#Package Dependency
#COPY /package*.json .
ADD . .

RUN npm install

EXPOSE 3000

ENTRYPOINT ["node", "app.js"]