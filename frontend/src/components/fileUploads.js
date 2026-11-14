import { apiRequest } from './api.js';

export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
export const VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-m4v'
];

export const MAX_NOTE_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const NOTE_ATTACHMENT_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'application/x-rtf',
    'text/rtf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.text',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
];

async function uploadFile(uploadUrlPath, finalizePath, file) {
    const upload = await apiRequest(uploadUrlPath, {
        method: 'POST',
        body: JSON.stringify({
            title: file.name,
            contentType: file.type,
            size: file.size
        })
    });

    let response;
    try {
        response = await fetch(upload.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': upload.contentType },
            body: file
        });
    } catch {
        throw new Error('The file could not reach Cloudflare R2. Check the bucket CORS settings and try again.');
    }

    if (!response.ok) {
        throw new Error(`Cloudflare R2 rejected the file upload (HTTP ${response.status}).`);
    }

    return apiRequest(finalizePath, {
        method: 'POST',
        body: JSON.stringify({
            objectKey: upload.objectKey,
            title: upload.title,
            contentType: upload.contentType,
            size: upload.size
        })
    });
}

export async function uploadVideoFile(resourceType, resourceId, file) {
    const resourcePath = resourceType === 'course' ? '/allcourses' : '/allbatches';
    const resourceIdPath = encodeURIComponent(resourceId);
    return uploadFile(
        `${resourcePath}/${resourceIdPath}/videos/upload-url`,
        `${resourcePath}/${resourceIdPath}/videos`,
        file
    );
}

export async function uploadNoteAttachment(noteId, file) {
    const notePath = `/notes/${encodeURIComponent(noteId)}/attachments`;
    return uploadFile(`${notePath}/upload-url`, notePath, file);
}
