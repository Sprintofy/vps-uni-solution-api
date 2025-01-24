module.exports = {
    apps: [
        {
            name: 'Pre Trade API',            // Name of your application
            script: './server.ts',            // Entry point (your server.ts file)
            node_args: '-r ts-node/register -r dotenv/config',  // Use ts-node to run TypeScript and dotenv for environment variables
            watch: true,                      // Watch for file changes and restart automatically
            instances: 1,                     // Number of instances (use 'max' to utilize all CPU cores)
            exec_mode: 'fork',                // Use 'fork' mode (use 'cluster' for load balancing with multiple instances)
            env: {
                NODE_ENV: 'development',        // Environment variable for development
            },
            env_production: {
                NODE_ENV: 'production',         // Environment variable for production
            },
            interpreter: '/usr/bin/node',     // Explicitly set Node.js as the interpreter
            //ignore_watch: ["src/services/uploads","src/services/upload"]
        },
    ],
};
