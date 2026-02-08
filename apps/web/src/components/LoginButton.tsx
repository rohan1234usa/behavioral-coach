"use client"
import { signIn } from "next-auth/react"

export function LoginButton() {
    return (
        <button
            onClick={() => signIn("google")}
            className="hidden md:block px-4 py-2 border border-border text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-colors"
        >
            Login
        </button>
    )
}
