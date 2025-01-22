import { S3 } from "aws-sdk";
import CONFIG from "../../config";
import url from 'url';
import fs from "fs"
let mime = require('mime-types')


const bucketName = CONFIG.AWS.S3.BUCKET_NAME;
const region = CONFIG.AWS.S3.REGION;

// Configure the AWS SDK with your credentials and region
const awsConfig = {
    accessKeyId: CONFIG.AWS.S3.ACCESS_KEY,
    secretAccessKey: CONFIG.AWS.S3.SECRET_KEY,
    region: CONFIG.AWS.S3.REGION,
};
const s3 = new S3(awsConfig);

const isFolderExists = async (folderName: string): Promise<boolean> => {
    const params = {
        Bucket: bucketName,
        Prefix: folderName,
        Delimiter: "/",
        MaxKeys: 1,
    };
    try {
        const response = await s3.listObjectsV2(params).promise();
        return response.Contents !== undefined && response.Contents.length > 0;
    } catch (error: any) {
        console.error(`Error checking folder existence: ${error.message}`);
        throw error;
    }
};

const createFolder = async (folderName: string): Promise<void> => {
    const params = {
        Bucket: bucketName,
        Key: folderName + "/",
        Body: "",
    };

    try {
        await s3.upload(params).promise();
        console.log(`Folder '${folderName}' created successfully.`);
    } catch (error: any) {
        console.error(`Error creating folder: ${error.message}`);
        throw error;
    }
};

const uploadFile = async (fileContent: any, folderName: any, fileName: any) => {
    const uploadResult = await s3.upload({
        Bucket: bucketName,
        Body: fileContent,
        Key: `${folderName}/${fileName}`,
        ContentDisposition: 'attachment',
    }).promise();
    // console.log("File uploaded on s3", uploadResult.Location)
    return uploadResult

};

const uploadExcelfile = async (data: any, key: any) => {

    const params: any = {
        Bucket: bucketName,
        Body: data,
        Key: key, // Set the desired file name in S3
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    try {
        const uploadResult = await s3.upload(params).promise();
        return uploadResult;
        console.log(`File uploaded successfully at ${uploadResult.Location}`);
    } catch (error) {
        return error;
        console.error('Error uploading to S3:', error);
    }
}

const uploadFilestreamToS3 = async (data: any) => {
    try {

        if (data.file.type === undefined || data.file.type === null) data.file.type = '';
        let fileStream = fs.createReadStream(data.file.path);
        let response = await s3
            .putObject({
                Bucket: bucketName,
                Key: data.file.type + data.file.name,
                ContentType: mime.lookup(data.file.path),
                Body: fileStream,
                // ACL:'public-read'
            }).promise();
        return { url: CONFIG.AWS.S3.BASE_URL + data.file.type + data.file.name };
    } catch (error) {
        throw error;
    }
}

const getPublicUrlForS3Path = async (s3Path: string): Promise<string> => {
    try {
        const params: S3.Types.GetObjectRequest = {
            Bucket: bucketName,
            Key: s3Path,
        };
        const signedUrl = await s3.getSignedUrlPromise('getObject', params);

        const s3PathFromUrl = new URL(signedUrl).pathname;
        return `https://${bucketName}.s3.${region}.amazonaws.com${s3PathFromUrl}`;
    } catch (error: any) {
        console.error(`Error generating signed URL: ${error.message}`);
        throw error;
    }
};

const getS3Object = async (s3Path: string): Promise<string> => {
    try {
        const response = await s3.getObject({ Bucket: bucketName, Key: s3Path }).promise();
        return response.Body?.toString('utf-8') || '';
    } catch (error: any) {
        console.error(`Error fetching S3 object at ${s3Path}:`, error.message);
        throw error;
    }
};

const downloadFileFromS3 = async (key: string, file_path: string) => {
    const params = { Bucket: bucketName, Key: key };
    const file = fs.createWriteStream(file_path);
    return new Promise<void>((resolve, reject) => {
        s3.getObject(params)
            .createReadStream()
            .on('error', reject)
            .pipe(file)
            .on('close', resolve);
    });
};

module.exports = {
    isFolderExists,
    createFolder,
    uploadFile,
    getPublicUrlForS3Path,
    uploadFilestreamToS3,
    getS3Object,
    uploadExcelfile,
    downloadFileFromS3
};
