import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { useAuth } from '../auth-context.js';
import './LearningDetail.css';

function getVideoPlayerSource(videoUrl) {
    try {
        const url = new URL(videoUrl);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';

        const host = url.hostname.toLowerCase();
        const youtubeHosts = ['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
        if (youtubeHosts.includes(host)) {
            const videoId = host === 'youtu.be'
                ? url.pathname.split('/').filter(Boolean)[0] || ''
                : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] || '';
            const playlistId = url.searchParams.get('list') || '';
            if (/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
                const playlistQuery = playlistId ? `?list=${encodeURIComponent(playlistId)}` : '';
                return {
                    type: 'embed',
                    src: `https://www.youtube-nocookie.com/embed/${videoId}${playlistQuery}`
                };
            }
            if (/^[A-Za-z0-9_-]+$/.test(playlistId)) {
                return {
                    type: 'embed',
                    src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`
                };
            }
        }

        if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
            const videoId = url.pathname.match(/\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];
            if (videoId) return { type: 'embed', src: `https://player.vimeo.com/video/${videoId}` };
        }

        if (host === 'drive.google.com' || host === 'www.drive.google.com') {
            const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
            if (fileId && /^[A-Za-z0-9_-]+$/.test(fileId)) {
                return { type: 'embed', src: `https://drive.google.com/file/d/${fileId}/preview` };
            }
        }

        if (['loom.com', 'www.loom.com'].includes(host)) {
            const videoId = url.pathname.match(/^\/share\/([^/]+)/)?.[1];
            if (videoId) return { type: 'embed', src: `https://www.loom.com/embed/${videoId}` };
        }

        if (['wistia.com', 'www.wistia.com'].includes(host)) {
            const videoId = url.pathname.match(/^\/medias\/([^/]+)/)?.[1];
            if (videoId) return { type: 'embed', src: `https://fast.wistia.net/embed/iframe/${videoId}` };
        }

        if (/\.(?:mp4|webm|ogg|mov|m4v)$/i.test(url.pathname)) {
            return { type: 'video', src: url.href };
        }

        return { type: 'link', src: url.href };
    } catch {
        return null;
    }
}

function LearningVideo({ url, index, title, isUploaded }) {
    const videoTitle = title || `Video ${index + 1}`;
    const playerSource = getVideoPlayerSource(url);

    return (
        <article className={`learning-video${isUploaded ? ' learning-video-uploaded' : ''}`}>
            {isUploaded && <span className="learning-video-badge">Uploaded video</span>}
            <h3>{videoTitle}</h3>
            {playerSource?.type === 'embed' ? (
                <div className="learning-video-frame">
                    <iframe
                        src={playerSource.src}
                        title={videoTitle}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    />
                </div>
            ) : playerSource?.type === 'video' ? (
                <video className="learning-video-player" controls preload="metadata" playsInline>
                    <source src={playerSource.src} />
                    Your browser does not support embedded videos.
                </video>
            ) : playerSource?.type === 'link' ? (
                <a href={playerSource.src} target="_blank" rel="noopener noreferrer">
                    This video host does not support in-page playback. Open in a new tab.
                </a>
            ) : (
                <p className="learning-detail-error">This video URL is invalid.</p>
            )}
        </article>
    );
}

function LearningDetail({ type }) {
    const { id } = useParams();
    const { user } = useAuth();
    return <LearningDetailContent key={`${type}:${id}:${user?.username || 'guest'}:${user?.role || ''}`} id={id} type={type} user={user} />;
}

function LearningDetailContent({ id, type, user }) {
    const isCourse = type === 'course';
    const endpoint = isCourse ? '/allcourses' : '/allbatches';
    const itemNameField = isCourse ? 'course_name' : 'batch_name';
    const videosField = isCourse ? 'course_videos' : 'batch_videos';
    const videoFilesField = isCourse ? 'course_video_files' : 'batch_video_files';
    const [item, setItem] = useState(null);
    const [content, setContent] = useState(null);
    const [error, setError] = useState('');
    const [contentError, setContentError] = useState(
        user ? '' : `Sign in and enroll in this ${isCourse ? 'course' : 'batch'} to access its videos.`
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(Boolean(user));

    useEffect(() => {
        let isMounted = true;
        const itemPath = `${endpoint}/${encodeURIComponent(id)}`;

        apiRequest(itemPath)
            .then((result) => {
                if (isMounted) setItem(result);
            })
            .catch((requestError) => {
                if (isMounted) setError(requestError.message);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        if (user) {
            apiRequest(`${itemPath}/content`)
                .then((result) => {
                    if (isMounted) setContent(result);
                })
                .catch((requestError) => {
                    if (isMounted) setContentError(requestError.message);
                })
                .finally(() => {
                    if (isMounted) setIsLoadingContent(false);
                });
        }

        return () => {
            isMounted = false;
        };
    }, [endpoint, id, isCourse, user]);

    const videos = content ? [
        ...(content[videosField] || []).map((url) => ({ url, isUploaded: false })),
        ...(content[videoFilesField] || []).map((video) => ({ ...video, isUploaded: true }))
    ] : [];
    const itemName = item?.[itemNameField] || (isCourse ? 'Course' : 'Batch');
    const listingPath = isCourse ? '/allcourses' : '/allbatches';

    if (isLoading) {
        return <main className="learning-detail-page"><p>Loading {isCourse ? 'course' : 'batch'}…</p></main>;
    }

    if (error || !item) {
        return (
            <main className="learning-detail-page">
                <Link className="learning-detail-back" to={listingPath}>← Back to {isCourse ? 'courses' : 'batches'}</Link>
                <p className="learning-detail-error" role="alert">{error || `Could not find this ${isCourse ? 'course' : 'batch'}.`}</p>
            </main>
        );
    }

    return (
        <main className="learning-detail-page">
            <nav className="learning-detail-nav" aria-label={`${isCourse ? 'Course' : 'Batch'} navigation`}>
                <Link className="learning-detail-back" to={listingPath}>← Back to {isCourse ? 'courses' : 'batches'}</Link>
                <Link className="learning-detail-back" to="/">Home</Link>
            </nav>

            <header className="learning-detail-header">
                {item[isCourse ? 'course_img' : 'batch_img'] && (
                    <img
                        src={item[isCourse ? 'course_img' : 'batch_img']}
                        alt=""
                    />
                )}
                <div>
                    <p className="learning-detail-eyebrow">{isCourse ? 'COURSE' : 'BATCH'} {item[isCourse ? 'course_id' : 'batch_id']}</p>
                    <h1>{itemName}</h1>
                    {isCourse ? (
                        <p>{[item.course_class, item.course_subject, item.course_duration].filter(Boolean).join(' · ')}</p>
                    ) : (
                        <p>{[item.batch_duration, item.batch_language, item.batch_teacher].filter(Boolean).join(' · ')}</p>
                    )}
                </div>
            </header>

            {isCourse && item.course_description && (
                <section className="learning-detail-description">
                    <h2>About this course</h2>
                    <p>{item.course_description}</p>
                </section>
            )}

            <section className="learning-detail-content" aria-labelledby="learning-videos-heading">
                <div className="learning-detail-section-heading">
                    <p className="learning-detail-eyebrow">LEARNING LIBRARY</p>
                    <h2 id="learning-videos-heading">Videos</h2>
                </div>
                {isLoadingContent ? (
                    <p>Loading learning content…</p>
                ) : contentError ? (
                    <div className="learning-detail-access-message">
                        <p role="status">{contentError}</p>
                        {!user && <Link to="/login">Sign in</Link>}
                        {user?.role === 'student' && <Link to={listingPath}>Browse {isCourse ? 'courses' : 'batches'}</Link>}
                    </div>
                ) : videos.length > 0 ? (
                    <div className="learning-video-list">
                        {videos.map((video, index) => (
                            <LearningVideo
                                key={video._id || `${video.url}-${index}`}
                                url={video.url}
                                title={video.title || `${itemName} video ${index + 1}`}
                                index={index}
                                isUploaded={video.isUploaded}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="learning-detail-empty">No videos have been added to this {isCourse ? 'course' : 'batch'} yet.</p>
                )}
            </section>

            {!isCourse && !contentError && !isLoadingContent && (
                <section className="learning-detail-live-class" aria-labelledby="live-class-heading">
                    <div>
                        <p className="learning-detail-eyebrow">JOIN YOUR CLASS</p>
                        <h2 id="live-class-heading">Live classes</h2>
                    </div>
                    {content?.batch_live_class_url ? (
                        <a href={content.batch_live_class_url} target="_blank" rel="noopener noreferrer">
                            Join live class
                        </a>
                    ) : (
                        <p className="learning-detail-empty">A live class link has not been added yet.</p>
                    )}
                </section>
            )}
        </main>
    );
}

export default LearningDetail;
