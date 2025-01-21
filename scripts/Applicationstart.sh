#!/bin/bash
echo "Running Hook: applicationstart.sh"
cd /home/ubuntu/uni-solution-api
source /etc/profile
# Start PM2
pm2 start pm2.config.js 2>&1
if [ $? != "0" ]; then
   error_exit "pm2 start unsuccessful"
else
   echo "PM2 started";
fi
exit 0
