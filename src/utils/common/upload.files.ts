import path from "path";
import dotenv from "dotenv";
const Minio = require("minio");

// Load environment variables from .env file
dotenv.config();

const minioClient = new Minio.Client({
    endPoint: 'object-app.kmall.io',
    useSSL: true,
    accessKey: process.env.S3_BUCKET_ACCESS_KEY, // find on creds file
    secretKey: process.env.S3_BUCKET_SECRET_KEY, // find on creds file
});

export const writeObject = async (name: string): Promise<boolean> => {
    try {
        console.log("Started uploading....");
        // File to upload
        const sourceFile = path.join(process.cwd(), name);
        // const sourceFile = './reawards-1893094884.json'
        // Destination bucket
        const bucket = 'homnifi-rewards'
        // Destination object name
        const destinationObject = name
        // Check if the bucket exists
        // If it doesn't, create it
        const exists = await minioClient.bucketExists(bucket)
        if (exists) {
            console.log('Bucket ' + bucket + ' exists.')
        } else {
            console.log("No bucket exists");
            process.exit();
        }
        // Set the object metadata
        var metaData = {
            'Content-Type': 'application/json'
        }
        // Upload the file with fPutObject
        // If an object with the same name exists,
        // it is updated with new data
        await minioClient.fPutObject(bucket, destinationObject, sourceFile, metaData)
        console.log('File ' + sourceFile + ' uploaded as object ' + destinationObject + ' in bucket ' + bucket)
        return true;
    } catch (error) {
        console.error('Error uploading file:', error);
        return false;
    }
}

export async function readObject(fileName: string): Promise<string> {
    try {
        // presigned url for 'getObject' method.
        // expires in a day.
        const presignedUrl = await minioClient.presignedUrl('GET', 'homnifi-rewards', fileName, 86400)
        console.log(presignedUrl);
        return presignedUrl;
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        throw error;
    }
}

