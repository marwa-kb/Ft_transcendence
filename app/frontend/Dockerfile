###################
# Build for development phase
###################

FROM node:18 AS development

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

WORKDIR /node
COPY package*.json tsconfig.json ./

# Default build argument is dev
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
ARG FRONTEND_PORT
ENV FRONTEND_PORT=${FRONTEND_PORT}
RUN npm ci
WORKDIR /node/app

EXPOSE ${FRONTEND_PORT}
CMD ["npm", "run", "dev"]

###################
# Build for production phase
###################

FROM nginx:1.21.6 AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /node

RUN chown -R nginx:nginx /node && chmod -R 755 /node && \
        chown -R nginx:nginx /var/cache/nginx && \
        chown -R nginx:nginx /var/log/nginx && \
        chown -R nginx:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && \
        chown -R nginx:nginx /var/run/nginx.pid

USER root
RUN apt-get update && apt-get install -y \
    software-properties-common \
    npm
RUN npm install npm@latest -g && \
    npm install n -g && \
    n 18

COPY package*.json tsconfig.json ./
RUN npm install
COPY . .
RUN npm run build

# Remove default nginx static resources
RUN rm -rf /usr/share/nginx/html/*
RUN mv dist/* /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

USER nginx
EXPOSE 80

# run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
