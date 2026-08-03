"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { csCZ } from "@clerk/localizations";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import UserSync from "../components/UserSync";

const convex = new ConvexReactClient(
    process.env.NEXT_PUBLIC_CONVEX_URL || "https://falling-badger-123.convex.cloud"
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    return (
        <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/home"
            signUpFallbackRedirectUrl="/home"
            localization={csCZ}
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        >
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <UserSync />
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}
