#!/bin/bash
echo "Running Hook: applicationstart.sh"

# Navigate to the project directory
cd /home/ubuntu/uni-solution-api

# Define error_exit function to handle script errors
error_exit()
{
    echo "$1" 1>&2
    exit 1
}

# Start PM2 using the config file
pm2 start pm2.config.js 2>&1
if [ $? != "0" ]; then
   error_exit "PM2 start unsuccessful"
else
   echo "PM2 started successfully"
fi

exit 0
