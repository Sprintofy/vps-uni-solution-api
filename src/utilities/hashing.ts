'use strict';
import bcrypt from "bcrypt";


class Hashing {
    constructor() {
    }

    public async generateHash (password: string, saltRounds: number): Promise<any> {
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, saltRounds, (err: any, hash: any) => {
                if (!err) {
                    resolve(hash);
                }
                reject(err);
            });
        });
    }

    public async verifyHash (password: string, hashPassword: string): Promise<any> {
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, hashPassword, (err: any, hash: any) => {
                if (!err) {
                    resolve(hash);
                }
                reject(err);
            });
        });
    }

}

export default new Hashing ();
