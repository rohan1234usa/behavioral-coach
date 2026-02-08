'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechSettings {
    selectedVoice: string;
    voiceSpeed: number;
    autoReadQuestions: boolean;
}

interface UseSpeechSynthesisReturn {
    speak: (text: string) => void;
    stop: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
    settings: SpeechSettings;
}

const DEFAULT_SETTINGS: SpeechSettings = {
    selectedVoice: '',
    voiceSpeed: 1,
    autoReadQuestions: false,
};

/**
 * Custom hook for text-to-speech functionality
 * Reads settings from localStorage (coachSettings) set by the Settings page
 */
export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [settings, setSettings] = useState<SpeechSettings>(DEFAULT_SETTINGS);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Check for browser support and load settings
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            setIsSupported(true);

            // Load settings from localStorage
            const loadSettings = () => {
                try {
                    const savedSettings = localStorage.getItem('coachSettings');
                    if (savedSettings) {
                        const parsed = JSON.parse(savedSettings);
                        setSettings({
                            selectedVoice: parsed.selectedVoice || '',
                            voiceSpeed: parsed.voiceSpeed || 1,
                            autoReadQuestions: parsed.autoReadQuestions ?? false,
                        });
                    }
                } catch (e) {
                    console.warn('Failed to load speech settings:', e);
                }
            };

            loadSettings();

            // Listen for storage changes (in case settings are updated in another tab)
            const handleStorageChange = (e: StorageEvent) => {
                if (e.key === 'coachSettings') {
                    loadSettings();
                }
            };

            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
    }, []);

    // Speak function
    const speak = useCallback((text: string) => {
        if (!isSupported || typeof window === 'undefined') return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        // Apply settings
        utterance.rate = settings.voiceSpeed;

        // Find and set the selected voice
        if (settings.selectedVoice) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.voiceURI === settings.selectedVoice);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        // Event handlers
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [isSupported, settings]);

    // Stop function
    const stop = useCallback(() => {
        if (!isSupported || typeof window === 'undefined') return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [isSupported]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return {
        speak,
        stop,
        isSpeaking,
        isSupported,
        settings,
    };
}

/**
 * Hook that automatically speaks text when it changes (if auto-read is enabled)
 */
export function useAutoSpeak(text: string | null, enabled: boolean = true) {
    const { speak, settings, isSupported } = useSpeechSynthesis();
    const hasSpokenRef = useRef<string | null>(null);

    useEffect(() => {
        // Only auto-speak if:
        // 1. We have text
        // 2. Auto-read is enabled in settings
        // 3. The feature is enabled via prop
        // 4. We haven't already spoken this text
        // 5. Browser supports speech synthesis
        if (
            text &&
            settings.autoReadQuestions &&
            enabled &&
            hasSpokenRef.current !== text &&
            isSupported
        ) {
            // Small delay to ensure the UI has rendered
            const timer = setTimeout(() => {
                speak(text);
                hasSpokenRef.current = text;
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [text, settings.autoReadQuestions, enabled, speak, isSupported]);
}
