const { createCipheriv, createDecipheriv, createHash, randomBytes } = require('node:crypto');
const mongoose = require('mongoose');
const Enquiry = require('../models/enquiry');
const { createConversationUrl, getMailSettings, sendEmail } = require('../services/enquiryMailer');

const VALID_TOPICS = ['courses', 'batches', 'account', 'other'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGES_PER_ENQUIRY = 500;

function getAccessKey() {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required to encrypt enquiry access links.');
    }
    return createHash('sha256').update(`brightpath-enquiry-token:${process.env.JWT_SECRET}`).digest();
}

function encryptAccessToken(token) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', getAccessKey(), iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptAccessToken(encryptedToken) {
    const [ivHex, authTagHex, ciphertextHex] = encryptedToken.split(':');
    const decipher = createDecipheriv('aes-256-gcm', getAccessKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextHex, 'hex')),
        decipher.final()
    ]).toString('utf8');
}

function hashAccessToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

function readMessage(value) {
    if (typeof value !== 'string') return '';
    return value.trim();
}

function isValidMessage(message) {
    return message.length >= 1 && message.length <= 2000;
}

function publicConversation(enquiry) {
    return {
        id: enquiry._id,
        name: enquiry.name,
        topic: enquiry.topic,
        createdAt: enquiry.createdAt,
        messages: enquiry.messages
    };
}

function readToken(token) {
    return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? token : '';
}

async function submitEnquiry(req, res) {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const topic = typeof req.body?.topic === 'string' ? req.body.topic : '';
    const message = readMessage(req.body?.message);

    if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ error: 'Enter your name using 2 to 80 characters.' });
    }
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!VALID_TOPICS.includes(topic)) {
        return res.status(400).json({ error: 'Choose a valid enquiry topic.' });
    }
    if (message.length < 10 || message.length > 2000) {
        return res.status(400).json({ error: 'Your message must be between 10 and 2,000 characters.' });
    }

    let accessToken;
    try {
        getAccessKey();
        accessToken = randomBytes(32).toString('hex');
    } catch (error) {
        return res.status(503).json({ error: error.message });
    }

    try {
        const enquiry = await Enquiry.create({
            name,
            email,
            topic,
            accessTokenHash: hashAccessToken(accessToken),
            accessTokenEncrypted: encryptAccessToken(accessToken),
            messages: [{ sender: 'candidate', message }]
        });
        let emailSent = false;
        try {
            const settings = getMailSettings();
            const conversationUrl = createConversationUrl(settings.frontendUrl, accessToken);
            const [candidateDelivery, adminDelivery] = await Promise.allSettled([
                sendEmail({
                    to: email,
                    subject: 'Your Garvit enquiry conversation',
                    text: `Hi ${name},\n\nThanks for reaching out to Garvit. Your enquiry has been received.\n\nUse this private link to view our replies and continue the conversation:\n${conversationUrl}\n\nKeep this link private. Anyone with it can view and reply to this enquiry.`
                }),
                sendEmail({
                    to: settings.adminEmail,
                    subject: `New Garvit enquiry: ${topic}`,
                    text: `A new enquiry was submitted by ${name} (${email}).\n\n${message}\n\nOpen the admin enquiry inbox: ${new URL('/admin#enquiries', settings.frontendUrl)}`
                })
            ]);
            if (candidateDelivery.status === 'fulfilled') {
                enquiry.accessEmailSentAt = new Date();
                await enquiry.save();
                emailSent = true;
            } else {
                console.error('Could not email an enquiry access link:', candidateDelivery.reason);
            }
            if (adminDelivery.status === 'rejected') {
                console.error('Could not email the admin about a new enquiry:', adminDelivery.reason);
            }
        } catch (error) {
            console.error('Could not send enquiry notification emails:', error);
        }

        return res.status(201).json({
            message: emailSent
                ? 'Your enquiry was received. Check your email for a private link to continue the conversation.'
                : 'Your enquiry was saved, but we could not send the conversation link. The Garvit team can still see your enquiry.',
            emailSent
        });
    } catch (error) {
        console.error('Could not save an enquiry:', error);
        return res.status(500).json({ error: 'Could not save your enquiry. Please try again.' });
    }
}

async function getCandidateConversation(req, res) {
    res.set('Cache-Control', 'no-store');
    const token = readToken(req.params.token);
    if (!token) return res.status(404).json({ error: 'This enquiry conversation could not be found.' });

    try {
        const enquiry = await Enquiry.findOne({ accessTokenHash: hashAccessToken(token) })
            .select('name topic createdAt messages');
        if (!enquiry) return res.status(404).json({ error: 'This enquiry conversation could not be found.' });
        return res.json(publicConversation(enquiry));
    } catch (error) {
        console.error('Could not load an enquiry conversation:', error);
        return res.status(500).json({ error: 'Could not load this conversation.' });
    }
}

async function sendCandidateMessage(req, res) {
    res.set('Cache-Control', 'no-store');
    const token = readToken(req.params.token);
    const message = readMessage(req.body?.message);
    if (!token) return res.status(404).json({ error: 'This enquiry conversation could not be found.' });
    if (!isValidMessage(message)) {
        return res.status(400).json({ error: 'Your message must be between 1 and 2,000 characters.' });
    }

    try {
        const enquiry = await Enquiry.findOne({ accessTokenHash: hashAccessToken(token) });
        if (!enquiry) return res.status(404).json({ error: 'This enquiry conversation could not be found.' });
        if (enquiry.messages.length >= MAX_MESSAGES_PER_ENQUIRY) {
            return res.status(409).json({ error: 'This conversation has reached its message limit. Contact Garvit for further help.' });
        }

        enquiry.messages.push({ sender: 'candidate', message });
        await enquiry.save();
        let notificationSent = false;
        try {
            const settings = getMailSettings();
            const conversationUrl = createConversationUrl(settings.frontendUrl, token);
            await sendEmail({
                to: settings.adminEmail,
                subject: `New message from ${enquiry.name} about ${enquiry.topic}`,
                text: `${enquiry.name} (${enquiry.email}) sent a message:\n\n${message}\n\nReply in the Garvit admin inbox: ${new URL('/admin#enquiries', settings.frontendUrl)}\n\nConversation: ${conversationUrl}`
            });
            notificationSent = true;
        } catch (error) {
            console.error('Could not email the admin about an enquiry reply:', error);
        }

        return res.json({ enquiry: publicConversation(enquiry), notificationSent });
    } catch (error) {
        console.error('Could not save a candidate enquiry reply:', error);
        return res.status(500).json({ error: 'Could not send your message. Please try again.' });
    }
}

async function getAdminEnquiries(req, res) {
    try {
        const enquiries = await Enquiry.find()
            .select('name email topic accessEmailSentAt messages createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .lean();
        return res.json(enquiries.map((enquiry) => ({ ...enquiry, id: enquiry._id })));
    } catch (error) {
        console.error('Could not load the admin enquiry inbox:', error);
        return res.status(500).json({ error: 'Could not load enquiries.' });
    }
}

async function replyToEnquiry(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid enquiry ID.' });
    const message = readMessage(req.body?.message);
    if (!isValidMessage(message)) {
        return res.status(400).json({ error: 'Your reply must be between 1 and 2,000 characters.' });
    }

    try {
        const enquiry = await Enquiry.findById(req.params.id).select('+accessTokenEncrypted');
        if (!enquiry) return res.status(404).json({ error: 'Enquiry not found.' });
        if (enquiry.messages.length >= MAX_MESSAGES_PER_ENQUIRY) {
            return res.status(409).json({ error: 'This conversation has reached its message limit.' });
        }

        enquiry.messages.push({ sender: 'admin', message });
        await enquiry.save();

        let notificationSent = false;
        try {
            const settings = getMailSettings();
            const accessToken = decryptAccessToken(enquiry.accessTokenEncrypted);
            const conversationUrl = createConversationUrl(settings.frontendUrl, accessToken);
            await sendEmail({
                to: enquiry.email,
                subject: 'A new reply to your Garvit enquiry',
                text: `Hi ${enquiry.name},\n\nThe Garvit team replied to your enquiry:\n\n${message}\n\nContinue the conversation using your private link:\n${conversationUrl}\n\nKeep this link private. Anyone with it can view and reply to this enquiry.`
            });
            notificationSent = true;
            enquiry.accessEmailSentAt = new Date();
            await enquiry.save();
        } catch (error) {
            console.error('Could not email a Garvit enquiry reply:', error);
        }

        return res.json({
            enquiry: {
                id: enquiry._id,
                name: enquiry.name,
                email: enquiry.email,
                topic: enquiry.topic,
                accessEmailSentAt: enquiry.accessEmailSentAt,
                messages: enquiry.messages,
                createdAt: enquiry.createdAt,
                updatedAt: enquiry.updatedAt
            },
            notificationSent
        });
    } catch (error) {
        console.error('Could not save an admin enquiry reply:', error);
        return res.status(500).json({ error: 'Could not save your reply.' });
    }
}

async function sendAccessLink(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid enquiry ID.' });

    let enquiry;
    try {
        enquiry = await Enquiry.findById(req.params.id).select('+accessTokenEncrypted');
        if (!enquiry) return res.status(404).json({ error: 'Enquiry not found.' });
    } catch (error) {
        console.error('Could not load an enquiry for link delivery:', error);
        return res.status(500).json({ error: 'Could not load this enquiry.' });
    }

    try {
        const settings = getMailSettings();
        const accessToken = decryptAccessToken(enquiry.accessTokenEncrypted);
        const conversationUrl = createConversationUrl(settings.frontendUrl, accessToken);
        await sendEmail({
            to: enquiry.email,
            subject: 'Your Garvit enquiry conversation link',
            text: `Hi ${enquiry.name},\n\nUse this private link to view and reply to your Garvit enquiry:\n${conversationUrl}\n\nKeep this link private. Anyone with it can view and reply to this enquiry.`
        });
        enquiry.accessEmailSentAt = new Date();
        await enquiry.save();
        return res.json({ message: 'The private conversation link was emailed to the candidate.' });
    } catch (error) {
        console.error('Could not resend an enquiry access link:', error);
        return res.status(503).json({ error: 'Could not send the conversation link. Check the email configuration and try again.' });
    }
}

module.exports = {
    getAdminEnquiries,
    getCandidateConversation,
    replyToEnquiry,
    sendAccessLink,
    sendCandidateMessage,
    submitEnquiry
};
