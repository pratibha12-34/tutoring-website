import { useCallback, useEffect, useRef, useState } from 'react';
import { VolumeOff, VolumeUp } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import './WelcomeAudio.css';

const AUDIO_PREFERENCE_KEY = 'brightpath-welcome-audio-enabled';
const AMBIENT_CHORDS = [
    { bass: 130.81, notes: [261.63, 329.63, 392, 493.88] },
    { bass: 110, notes: [220, 261.63, 329.63, 392] },
    { bass: 87.31, notes: [174.61, 220, 261.63, 329.63] },
    { bass: 98, notes: [196, 246.94, 293.66, 392] }
];
const AMBIENT_MELODY = [
    523.25, null, 659.25, 587.33, null, 392, 523.25, null,
    587.33, 659.25, null, 523.25, 392, null, 440, null
];

function isAudioEnabled() {
    try {
        return window.localStorage.getItem(AUDIO_PREFERENCE_KEY) === 'true';
    } catch {
        return false;
    }
}

function getGreeting(pathname) {
    return pathname === '/admin'
        ? 'Welcome to the Garvit Classes admin dashboard.'
        : 'Welcome to Garvit Classes. Let’s make today a great day for learning.';
}

const WelcomeAudio = () => {
    const { pathname } = useLocation();
    const [enabled, setEnabled] = useState(isAudioEnabled);
    const [audioBlocked, setAudioBlocked] = useState(isAudioEnabled);
    const audioRef = useRef(null);
    const isWelcomePage = pathname === '/' || pathname === '/admin';

    const stopAudio = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.timers.forEach((timerId) => window.clearInterval(timerId));
        window.speechSynthesis?.cancel();
        const now = audio.context.currentTime;
        audio.masterGain.gain.cancelScheduledValues(now);
        audio.masterGain.gain.setTargetAtTime(0, now, 0.12);
        window.setTimeout(() => audio.context.close(), 500);
        audioRef.current = null;
    }, []);

    const startAmbientMusic = useCallback(async () => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;

        let isNewContext = false;
        if (!audioRef.current) {
            const context = new AudioContext();
            const masterGain = context.createGain();
            const compressor = context.createDynamicsCompressor();
            masterGain.gain.value = 0.16;
            compressor.threshold.value = -18;
            compressor.knee.value = 18;
            compressor.ratio.value = 4;
            masterGain.connect(compressor);
            compressor.connect(context.destination);
            audioRef.current = { context, masterGain, timers: [] };
            isNewContext = true;
        }

        try {
            if (audioRef.current.context.state === 'suspended') {
                await audioRef.current.context.resume();
            }
        } catch {
            return false;
        }
        if (audioRef.current.context.state !== 'running') return false;
        if (isNewContext) {
            const { context, masterGain, timers } = audioRef.current;
            let chordIndex = 0;
            let melodyIndex = 0;

            const playChord = () => {
                if (context.state !== 'running') return;
                const now = context.currentTime;
                const chord = AMBIENT_CHORDS[chordIndex % AMBIENT_CHORDS.length];
                chordIndex += 1;

                const playPadNote = (frequency, volume, type = 'sine', detune = 0) => {
                    const oscillator = context.createOscillator();
                    const gain = context.createGain();
                    oscillator.type = type;
                    oscillator.frequency.value = frequency;
                    oscillator.detune.value = detune;
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(volume, now + 1.8);
                    gain.gain.setValueAtTime(volume, now + 5.4);
                    gain.gain.linearRampToValueAtTime(0, now + 7.2);
                    oscillator.connect(gain);
                    gain.connect(masterGain);
                    oscillator.start(now);
                    oscillator.stop(now + 7.3);
                };

                playPadNote(chord.bass / 2, 0.11);
                chord.notes.forEach((frequency, index) => {
                    const volume = index === 0 ? 0.075 : 0.055;
                    playPadNote(frequency, volume);
                    if (index > 0) playPadNote(frequency, volume * 0.22, 'triangle', 4);
                });
            };

            const playMelodyNote = () => {
                if (context.state !== 'running') return;
                const frequency = AMBIENT_MELODY[melodyIndex % AMBIENT_MELODY.length];
                melodyIndex += 1;
                if (!frequency) return;

                const now = context.currentTime;
                const oscillator = context.createOscillator();
                const filter = context.createBiquadFilter();
                const gain = context.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.value = frequency;
                filter.type = 'lowpass';
                filter.frequency.value = 1500;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.13, now + 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
                oscillator.connect(filter);
                filter.connect(gain);
                gain.connect(masterGain);
                oscillator.start(now);
                oscillator.stop(now + 2.25);
            };

            playChord();
            playMelodyNote();
            timers.push(
                window.setInterval(playChord, 7000),
                window.setInterval(playMelodyNote, 850)
            );
        }
        return true;
    }, []);

    const playGreeting = useCallback(async () => {
        try {
            const hasAmbientAudio = await startAmbientMusic();
            const speechSynthesis = window.speechSynthesis;
            if (!speechSynthesis || !window.SpeechSynthesisUtterance) {
                setAudioBlocked(!hasAmbientAudio);
                return;
            }

            speechSynthesis.cancel();
            const greeting = new window.SpeechSynthesisUtterance(getGreeting(pathname));
            greeting.rate = 0.92;
            greeting.pitch = 1.04;
            greeting.volume = 0.85;
            speechSynthesis.speak(greeting);
            setAudioBlocked(!hasAmbientAudio);
        } catch {
            setAudioBlocked(true);
        }
    }, [pathname, startAmbientMusic]);

    useEffect(() => {
        if (isWelcomePage) return undefined;
        stopAudio();
        if (enabled) window.setTimeout(() => setAudioBlocked(true), 0);
        return undefined;
    }, [enabled, isWelcomePage, stopAudio]);

    useEffect(() => () => stopAudio(), [stopAudio]);

    function disableAudio() {
        try {
            window.localStorage.removeItem(AUDIO_PREFERENCE_KEY);
        } catch {
            setAudioBlocked(true);
        }
        setEnabled(false);
        setAudioBlocked(false);
        stopAudio();
    }

    function toggleAudio() {
        if (enabled) {
            if (audioBlocked) {
                playGreeting();
                return;
            }
            disableAudio();
            return;
        }

        try {
            window.localStorage.setItem(AUDIO_PREFERENCE_KEY, 'true');
        } catch {
            setAudioBlocked(true);
        }
        setEnabled(true);
        playGreeting();
    }

    if (!isWelcomePage) return null;

    return (
        <div className="welcome-audio-control">
            <button type="button" onClick={toggleAudio} aria-pressed={enabled}>
                {enabled ? <VolumeUp /> : <VolumeOff />}
                {enabled ? audioBlocked ? 'Play welcome sound' : 'Turn sound off' : 'Enable welcome sound'}
            </button>
            {audioBlocked && (
                <>
                    <span role="status">Tap to allow audio playback, or keep the site muted.</span>
                    <button className="welcome-audio-disable" type="button" onClick={disableAudio}>Keep sound off</button>
                </>
            )}
        </div>
    );
};

export default WelcomeAudio;
