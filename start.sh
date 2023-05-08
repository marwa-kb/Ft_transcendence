#!/bin/bash

cd app
# Check if there are running containers
if [ $(docker ps -q | wc -l) -ne 0 ]; then
  docker-compose down
fi
cd backend
npm ci
cd ../frontend
npm ci
cd ..
docker-compose up -d --build