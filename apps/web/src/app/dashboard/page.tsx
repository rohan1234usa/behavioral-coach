'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { Play, Calendar, TrendingUp } from 'lucide-react';

export default function Dashboard() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSessions()
            .then(data => setSessions(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-12 text-center">Loading history...</div>;

    return (
        <div className="max-w-5xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Your Training History</h1>
                <Link href="/arena" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                    + New Session
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Question</th>
                            <th className="p-4">Confidence</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sessions.map((session) => (
                            <tr key={session.id} className="hover:bg-gray-50 transition">
                                <td className="p-4 text-gray-500 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(session.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4 font-medium text-gray-800">
                                    {session.transcript || "Practice Session"}
                                    {/* Using transcript field as placeholder for question/topic if 'question' column doesn't exist */}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-green-600 font-bold">
                                        <TrendingUp className="w-4 h-4" />
                                        {/* Assuming scores is a JSON object, adjust accessing it based on your DB model */}
                                        {session.scores?.confidence || 0}%
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Link
                                        href={`/results/${session.id}`}
                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        <Play className="w-4 h-4" /> Review
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {sessions.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        No sessions recorded yet. Go to the Arena!
                    </div>
                )}
            </div>
        </div>
    );
}