const {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
const VIDEO_EXTENSIONS = Object.freeze({
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v'
});

let client;

function getStorageSettings() {
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    const bucket = process.env.R2_BUCKET_NAME?.trim();
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
        throw new Error('File storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.');
    }
    return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getClient() {
    const settings = getStorageSettings();
    if (!client) {
        client = new S3Client({
            region: 'auto',
            endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: settings.accessKeyId,
                secretAccessKey: settings.secretAccessKey
            }
        });
    }
    return { client, bucket: settings.bucket };
}

async function createUploadUrl(objectKey, contentType) {
    const { client: storageClient, bucket } = getClient();
    return getSignedUrl(
        storageClient,
        new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType }),
        { expiresIn: 900 }
    );
}

async function createReadUrl(objectKey, contentType) {
    const { client: storageClient, bucket } = getClient();
    return getSignedUrl(
        storageClient,
        new GetObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            ResponseContentType: contentType,
            ResponseContentDisposition: 'inline'
        }),
        { expiresIn: 3600 }
    );
}

async function createDownloadUrl(objectKey, contentType, fileName) {
    const { client: storageClient, bucket } = getClient();
    const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
    return getSignedUrl(
        storageClient,
        new GetObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            ResponseContentType: contentType,
            ResponseContentDisposition: disposition
        }),
        { expiresIn: 3600 }
    );
}

async function getReadUrls(files) {
    return Promise.all(files.map(async (file) => ({
        _id: file._id,
        title: file.title,
        contentType: file.contentType,
        size: file.size,
        uploadedAt: file.uploadedAt,
        url: await createReadUrl(file.objectKey, file.contentType)
    })));
}

async function getDownloadUrls(files) {
    return Promise.all(files.map(async (file) => ({
        _id: file._id,
        title: file.title,
        contentType: file.contentType,
        size: file.size,
        uploadedAt: file.uploadedAt,
        url: await createDownloadUrl(file.objectKey, file.contentType, file.title)
    })));
}

async function getUploadedObjectInfo(objectKey) {
    const { client: storageClient, bucket } = getClient();
    const object = await storageClient.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    return { size: object.ContentLength, contentType: object.ContentType };
}

async function deleteObject(objectKey) {
    const { client: storageClient, bucket } = getClient();
    await storageClient.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}

async function deleteObjects(objectKeys) {
    if (objectKeys.length === 0) return;
    await Promise.all(objectKeys.map(deleteObject));
}

module.exports = {
    MAX_VIDEO_BYTES,
    VIDEO_EXTENSIONS,
    createUploadUrl,
    createReadUrl,
    createDownloadUrl,
    getReadUrls,
    getDownloadUrls,
    getUploadedObjectInfo,
    deleteObject,
    deleteObjects
};
