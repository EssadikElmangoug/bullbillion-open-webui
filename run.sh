#!/bin/bash

image_name="bullbillion"
container_name="bullbillion"
network_name="bullbillion-network"
host_port=3000
container_port=8080

# Create network if it doesn't exist
docker network create $network_name 2>/dev/null || true

# Start MongoDB container if not already running
docker stop mongodb
docker rm mongodb

docker run -d \
    --name mongodb \
    --network $network_name \
    -v mongodb_data:/data/db \
    mongo:latest

docker build -t "$image_name" .
docker stop "$container_name" &>/dev/null || true
docker rm "$container_name" &>/dev/null || true

docker run -d -p "$host_port":"$container_port" \
    --add-host=host.docker.internal:host-gateway \
    -v "${image_name}:/app/backend/data" \
    --name "$container_name" \
    --network $network_name \
    --restart always \
    "$image_name"

docker image prune -f

# !/bin/bash