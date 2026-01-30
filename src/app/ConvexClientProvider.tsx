"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useEffect, useState } from "react";
import UserSync from "../components/UserSync";

const convex = new ConvexReactClient(
    process.env.NEXT_PUBLIC_CONVEX_URL || "https://falling-badger-123.convex.cloud"
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch by not rendering Clerk until client-side is ready
    if (!mounted) {
        return null;
    }

    return (
        <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        >
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <UserSync />
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}
