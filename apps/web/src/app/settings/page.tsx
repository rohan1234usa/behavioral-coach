'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Sun, Moon, Monitor, Play, Square } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

// Available TTS voices (will be populated from browser API)
interface VoiceOption {
    name: string;
    lang: string;
    voiceURI: string;
}

export default function SettingsPage() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [voiceSpeed, setVoiceSpeed] = useState<number>(1);
    const [autoReadQuestions, setAutoReadQuestions] = useState<boolean>(false);
    const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Load voices from browser Speech Synthesis API
    useEffect(() => {
        const loadVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                const voices = window.speechSynthesis.getVoices();
                const voiceOptions: VoiceOption[] = voices
                    .filter(v => v.lang.startsWith('en'))
                    .map(v => {
                        // 1. Map generic Google/System voices to Human Names
                        let displayName = v.name;

                        if (v.name.includes('Google US English')) displayName = 'Alexa';
                        else if (v.name.includes('Google UK English Female')) displayName = 'Victoria';
                        else if (v.name.includes('Google UK English Male')) displayName = 'Arthur';
                        else {
                            // 2. For others, standard cleanup
                            displayName = v.name
                                .replace('Microsoft', '')
                                .replace('Google', '')
                                .replace('Desktop', '')
                                .replace('English', '')
                                .replace('United States', '')
                                .replace('United Kingdom', '')
                                .replace(/[()]/g, '')
                                .replace(/-/g, '')
                                .trim();
                        }

                        // Extract region code (US, UK, etc)
                        const region = v.lang.split('-')[1] || 'US';

                        return {
                            name: `${displayName} (${region})`,
                            lang: v.lang,
                            voiceURI: v.voiceURI
                        };
                    })
                    .sort((a, b) => a.name.localeCompare(b.name));

                setAvailableVoices(voiceOptions);
            }
        };

        loadVoices();

        // Chrome loads voices asynchronously
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Load saved settings from localStorage
        const savedSettings = localStorage.getItem('coachSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                // Note: theme is now managed by ThemeProvider
                if (settings.voiceSpeed) setVoiceSpeed(settings.voiceSpeed);
                if (settings.autoReadQuestions !== undefined) setAutoReadQuestions(settings.autoReadQuestions);

                // Only set selected voice from storage if we haven't already set it via loadVoices logic,
                // OR if we want to try to use it (loadVoices validation will handle invalid ones next time it runs)
                // Actually, simpler: Set it here, and let loadVoices validate it when voices align.
                if (settings.selectedVoice) setSelectedVoice(settings.selectedVoice);
            } catch (e) {
                console.warn('Failed to parse settings', e);
            }
        }
    }, []);

    // Validation & Default Selection Effect
    // Runs when voices are loaded OR when selectedVoice changes (to validate it)
    useEffect(() => {
        if (availableVoices.length > 0) {
            // If nothing selected, or selected voice doesn't exist in the list
            const exists = selectedVoice && availableVoices.some(v => v.voiceURI === selectedVoice);

            if (!selectedVoice || !exists) {
                // Smart default: Prefer Zira, Google US, or Samantha
                const preferred = availableVoices.find(v =>
                    v.name.includes('Zira') ||
                    v.name.includes('Google US') ||
                    v.name.includes('Samantha')
                );
                const defaultVoice = preferred ? preferred.voiceURI : availableVoices[0].voiceURI;

                // Only update if different (prevent loops, though !exists check handles it)
                if (selectedVoice !== defaultVoice) {
                    setSelectedVoice(defaultVoice);
                }
            }
        }
    }, [availableVoices, selectedVoice]);

    // Save other settings to localStorage (theme is handled by ThemeProvider)
    useEffect(() => {
        const settings = {
            selectedVoice,
            voiceSpeed,
            autoReadQuestions
        };
        localStorage.setItem('coachSettings', JSON.stringify(settings));
    }, [selectedVoice, voiceSpeed, autoReadQuestions]);

    // Test voice preview
    const previewVoice = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(
            "Tell me about a time when you had to overcome a significant challenge."
        );

        const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoice);
        if (voice) utterance.voice = voice;
        utterance.rate = voiceSpeed;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const stopPreview = () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-body p-6 md:p-12 max-w-4xl mx-auto">

            {/* HEADER */}
            <header className="mb-16 border-b-2 border-primary/5 pb-6">
                <h1 className="text-4xl md:text-5xl font-sans font-bold text-foreground mb-2">Settings</h1>
                <p className="text-muted-foreground max-w-md">
                    Configure your practice environment. Personalize the coaching experience.
                </p>
            </header>

            {/* SETTINGS SECTIONS */}
            <div className="space-y-12">

                {/* VOICE SETTINGS */}
                <section className="stacked-card p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center rounded-sm">
                            <Volume2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-sans font-bold uppercase tracking-tight">Voice Settings</h2>
                            <p className="text-sm text-muted-foreground">Configure text-to-speech for interview questions</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Voice Selection */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-sans">
                                Voice Selection
                            </label>
                            <select
                                value={selectedVoice}
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                className="w-full p-3 bg-surface border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {availableVoices.length === 0 ? (
                                    <option value="">Loading voices...</option>
                                ) : (
                                    availableVoices.map((voice) => (
                                        <option key={voice.voiceURI} value={voice.voiceURI}>
                                            {voice.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Voice Speed */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-sans">
                                Voice Speed: {voiceSpeed.toFixed(1)}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={voiceSpeed}
                                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-sm appearance-none cursor-pointer accent-primary bg-secondary dark:bg-muted dark:border dark:border-muted-foreground"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>Slow (0.5x)</span>
                                <span>Normal (1.0x)</span>
                                <span>Fast (2.0x)</span>
                            </div>
                        </div>

                        {/* Auto-Read Toggle */}
                        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-sm">
                            <div>
                                <span className="text-sm font-medium text-foreground">Auto-Read Questions</span>
                                <p className="text-xs text-muted-foreground">Automatically speak questions when they appear</p>
                            </div>
                            <button
                                onClick={() => setAutoReadQuestions(!autoReadQuestions)}
                                className={`w-10 h-6 rounded-sm border-2 transition-colors flex items-center p-0.5 ${autoReadQuestions ? 'bg-accent border-accent' : 'bg-foreground/10 border-foreground/30'
                                    }`}
                            >
                                <span
                                    className={`w-4 h-4 bg-primary rounded-sm shadow-sm transition-transform ${autoReadQuestions ? 'translate-x-full' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Preview Button */}
                        <button
                            onClick={isSpeaking ? stopPreview : previewVoice}
                            className="stone-button inline-flex items-center gap-2"
                        >
                            {isSpeaking ? (
                                <>
                                    <Square className="w-3 h-3 fill-current" />
                                    Stop Preview
                                </>
                            ) : (
                                <>
                                    <Play className="w-3 h-3 fill-current" />
                                    Preview Voice
                                </>
                            )}
                        </button>
                    </div>
                </section>

                {/* THEME SETTINGS */}
                <section className="stacked-card p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center rounded-sm">
                            {resolvedTheme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-sans font-bold uppercase tracking-tight">Appearance</h2>
                            <p className="text-sm text-muted-foreground">Customize the look and feel</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <button
                            onClick={() => setTheme('light')}
                            className={`p-6 border-2 rounded-sm flex flex-col items-center gap-3 transition-all ${theme === 'light'
                                ? 'border-primary bg-surface'
                                : 'border-border hover:border-muted-foreground'
                                }`}
                        >
                            <div className="w-16 h-12 bg-[#F5F5F4] border border-border rounded-sm flex items-center justify-center">
                                <Sun className="w-6 h-6 text-[#292524]" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wider">Light</span>
                        </button>

                        <button
                            onClick={() => setTheme('dark')}
                            className={`p-6 border-2 rounded-sm flex flex-col items-center gap-3 transition-all ${theme === 'dark'
                                ? 'border-primary bg-surface'
                                : 'border-border hover:border-muted-foreground'
                                }`}
                        >
                            <div className="w-16 h-12 bg-[#1C1917] border border-border rounded-sm flex items-center justify-center">
                                <Moon className="w-6 h-6 text-[#F5F5F4]" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wider">Dark</span>
                        </button>

                        <button
                            onClick={() => setTheme('system')}
                            className={`p-6 border-2 rounded-sm flex flex-col items-center gap-3 transition-all ${theme === 'system'
                                ? 'border-primary bg-surface'
                                : 'border-border hover:border-muted-foreground'
                                }`}
                        >
                            <div className="w-16 h-12 bg-gradient-to-br from-[#F5F5F4] to-[#1C1917] border border-border rounded-sm flex items-center justify-center">
                                <Monitor className="w-6 h-6 text-[#292524] drop-shadow-lg" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wider">System</span>
                            <span className="text-[10px] text-muted-foreground uppercase">
                                {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                            </span>
                        </button>
                    </div>
                </section>

                {/* SAVE INDICATOR */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-sans">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    Settings auto-saved
                </div>

            </div>
        </div>
    );
}
