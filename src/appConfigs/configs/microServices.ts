'use strict';
import { Application } from 'express';

interface Microservice {
    name: string;
    app: Application;
    port: number;
}

const microServices: Microservice[] = [
    // { name: 'User', index: usersApp, port: process.env.USERS_SERVICE_PORT || 3001 },
    // { name: 'Product', index: productApp, port: process.env.PRODUCTS_SERVICE_PORT || 3002 },
    // Add more microServices as needed
];

const startMicroservices = async (): Promise<void> => {
    for (const service of microServices) {
        const { name, app, port } = service;
        try {
            await new Promise<void>((resolve, reject) => {
                app.listen(port, () => {
                    console.log(`${name} Service started on http://localhost:${port}`);
                    resolve();
                }).on('error', (err: Error) => {
                    reject(err);
                });
            });
        } catch (error) {
            console.error(`Error starting service on port ${port}:`, error);
        }
    }
    console.log('All microServices are up and running.');
};

export default startMicroservices;

