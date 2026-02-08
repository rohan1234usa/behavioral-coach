'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
    const [mounted, setMounted] = useState(false);

    // Initialize theme from localStorage and system preferences
    useEffect(() => {
        setMounted(true);

        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            setThemeState(savedTheme);
        }
    }, []);

    // Update resolved theme based on theme preference and system settings
    useEffect(() => {
        const updateResolvedTheme = () => {
            let newResolvedTheme: ResolvedTheme;

            if (theme === 'system') {
                // Use system preference
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                newResolvedTheme = systemPrefersDark ? 'dark' : 'light';
            } else {
                // Use explicit preference
                newResolvedTheme = theme;
            }

            setResolvedTheme(newResolvedTheme);

            // Apply or remove .dark class on <html> element
            const root = document.documentElement;
            if (newResolvedTheme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        if (mounted) {
            updateResolvedTheme();
        }

        // Listen for system theme changes if theme is set to 'system'
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => updateResolvedTheme();

            // Modern browsers
            mediaQuery.addEventListener('change', handleChange);

            return () => {
                mediaQuery.removeEventListener('change', handleChange);
            };
        }
    }, [theme, mounted]);

    // Custom setTheme that also updates localStorage
    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
