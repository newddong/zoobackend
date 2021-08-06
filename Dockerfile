FROM node:14.16.1

#App Dir
WORKDIR /app

#Package Dependency
#COPY /package*.json .
ADD . .

# RUN npm install
RUN npm install -g nodemon

EXPOSE 3000

# ENTRYPOINT ["nodemon","-w" ,"./","./app.js"]
ENTRYPOINT ["node","./app.js"]