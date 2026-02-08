"use client"
import { signOut } from "next-auth/react"
import type { Session } from "next-auth"

export function UserMenu({ session }: { session: Session }) {
    // If no user, don't render (should be handled by parent, but safety check)
    if (!session.user) return null

    return (
        <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-widest hidden lg:block">
                {session.user.name ?? "User"}
            </span>
            {session.user.image && (
                <img
                    src={session.user.image}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border border-border"
                />
            )}
            <button
                onClick={() => signOut()}
                className="px-4 py-2 border border-border text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-colors"
            >
                Logout
            </button>
        </div>
    )
}
