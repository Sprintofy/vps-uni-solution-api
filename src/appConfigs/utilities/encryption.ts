const JWT = require('jsonwebtoken');
import CONFIGS from '../../config';

export default class Encryption {
    constructor() {

    }

    public static async generateJwtToken(data: any) {
        return await JWT.sign(data,
            CONFIGS.SECURITY.JWT_TOKEN.SECRET_KEY,
            {expiresIn: data.expires_in});
    }

    public async verifyJwtToken(token: string | string[]): Promise<any> {
        return new Promise((resolve, reject) => {
            JWT.verify(
                token,
                CONFIGS.SECURITY.JWT_TOKEN.SECRET_KEY,
                (err: Error, decoded: any) => {
                    if (err) {
                        resolve(null);
                    } else {
                        resolve(decoded);
                    }
                },
            );
        });
    }
}
