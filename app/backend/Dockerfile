###################
# Build for development phase
###################

FROM node:18 As development

#this is for MacOS, the prisma conflict
RUN apt-get update && apt-get install -y openssl
RUN apt-get update && apt-get install -y netcat

WORKDIR /usr/src/app
COPY package*.json ./
RUN apt-get install -y build-essential python
RUN npm ci
COPY . .

###################
# In production
###################
FROM node:18 as production

ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package*.json", "./"]
COPY prisma ./prisma/
RUN npm ci
COPY . .

RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:migrate:prod"]