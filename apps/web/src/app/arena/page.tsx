'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// This is the magic line that fixes "Worker is not defined"
const ArenaRecorder = dynamic(() => import('@/components/ArenaRecorder'), {
    ssr: false,
    loading: () => <p className="text-center p-12">Loading Camera Interface...</p>,
});

export default function ArenaPage() {
    return (
        <main className="min-h-screen bg-gray-50 py-12 flex flex-col items-center">
            <div className="container mx-auto">
                <ArenaRecorder />
            </div>
        </main>
    );
}