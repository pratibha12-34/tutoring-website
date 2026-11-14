import { useEffect } from 'react';

const configuredSiteUrl = (import.meta.env.VITE_SITE_URL || '').trim();

function getSiteOrigin() {
    if (configuredSiteUrl) {
        try {
            return new URL(configuredSiteUrl).origin;
        } catch {
            return '';
        }
    }

    if (import.meta.env.PROD && typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        return window.location.origin;
    }

    return '';
}

function updateHeadElement(tagName, identityAttribute, identity, attributes, textContent) {
    const element = Array.from(document.head.querySelectorAll(tagName))
        .find((item) => item.getAttribute(identityAttribute) === identity);
    const target = element || document.createElement(tagName);
    const previousAttributes = new Map(Object.keys(attributes).map((name) => [name, target.getAttribute(name)]));
    const previousText = target.textContent;

    target.setAttribute(identityAttribute, identity);
    Object.entries(attributes).forEach(([name, value]) => {
        if (value === null || value === undefined || value === '') target.removeAttribute(name);
        else target.setAttribute(name, value);
    });
    if (textContent !== undefined) target.textContent = textContent;
    if (!element) document.head.appendChild(target);

    return () => {
        if (!element) {
            target.remove();
            return;
        }
        previousAttributes.forEach((value, name) => {
            if (value === null) target.removeAttribute(name);
            else target.setAttribute(name, value);
        });
        target.textContent = previousText;
    };
}

function removeCanonicalLinks() {
    const removedLinks = Array.from(document.head.querySelectorAll('link[rel="canonical"]'))
        .map((link) => ({
            link,
            parent: link.parentNode,
            nextSibling: link.nextSibling
        }));
    removedLinks.forEach(({ link }) => link.remove());

    return () => {
        removedLinks.forEach(({ link, parent, nextSibling }) => {
            if (nextSibling?.parentNode === parent) parent.insertBefore(link, nextSibling);
            else parent.appendChild(link);
        });
    };
}

function normalizeDescription(value) {
    const description = String(value || '').replace(/\s+/g, ' ').trim();
    return description.length > 160 ? `${description.slice(0, 157).trimEnd()}...` : description;
}

const Seo = ({
    title,
    description,
    canonicalPath,
    noIndex = false,
    structuredData
}) => {
    const structuredDataJson = structuredData ? JSON.stringify(structuredData) : '';

    useEffect(() => {
        const previousTitle = document.title;
        document.title = title;

        const cleanups = [];
        const meta = (name, content) => {
            cleanups.push(updateHeadElement('meta', 'name', name, { content }));
        };
        const property = (name, content) => {
            cleanups.push(updateHeadElement('meta', 'property', name, { content }));
        };

        const normalizedDescription = normalizeDescription(description);
        const siteOrigin = getSiteOrigin();
        const path = (canonicalPath || window.location.pathname).split(/[?#]/)[0] || '/';
        const canonicalUrl = !noIndex && siteOrigin ? new URL(path, `${siteOrigin}/`).href : '';
        const imageUrl = siteOrigin ? `${siteOrigin}/assests/logo1.jpeg` : '';

        meta('description', normalizedDescription);
        meta('robots', noIndex ? 'noindex,nofollow' : 'index,follow');
        property('og:type', 'website');
        property('og:site_name', 'Garvit');
        property('og:title', title);
        property('og:description', normalizedDescription);
        property('og:url', canonicalUrl);
        property('og:image', imageUrl);
        property('og:image:alt', 'Garvit tutoring and learning');
        meta('twitter:card', 'summary_large_image');
        meta('twitter:title', title);
        meta('twitter:description', normalizedDescription);
        meta('twitter:image', imageUrl);

        if (noIndex) {
            cleanups.push(removeCanonicalLinks());
        } else if (canonicalUrl) {
            cleanups.push(updateHeadElement('link', 'rel', 'canonical', { href: canonicalUrl }));
        }

        if (structuredDataJson) {
            const parsedData = JSON.parse(structuredDataJson);
            if (!parsedData.url && canonicalUrl) parsedData.url = canonicalUrl;
            cleanups.push(updateHeadElement(
                'script',
                'id',
                'seo-structured-data',
                { type: 'application/ld+json' },
                JSON.stringify(parsedData)
            ));
        }

        return () => {
            cleanups.reverse().forEach((cleanup) => cleanup());
            document.title = previousTitle;
        };
    }, [title, description, canonicalPath, noIndex, structuredDataJson]);

    return null;
};

export default Seo;
