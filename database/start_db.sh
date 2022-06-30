#!/bin/bash

docker-compose --env-file ../config/.env up -d

echo "Database daemon started."