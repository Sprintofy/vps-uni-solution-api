#!/bin/bash
set -e

# Navigate to the project directory
cd /home/ubuntu/uni-solution-api

# Install dependencies
npm install

# Build the application
npm run build

# Kill PM2 processes
pm2 kill
echo "All PM2 processes killed"

# Stop any PM2 processes (optional, since pm2 kill already stops all)
# pm2 stop all
echo "PM2 Stop All Successful"
