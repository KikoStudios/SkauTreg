const clerkDomain =
    process.env.CLERK_ISSUER_URL ??
    process.env.CLERK_JWT_ISSUER ??
    (process.env.NEXT_PUBLIC_CLERK_FRONTEND_API
        ? `https://${process.env.NEXT_PUBLIC_CLERK_FRONTEND_API}`
        : undefined);

if (!clerkDomain) {
    throw new Error(
        "Missing Clerk issuer domain for Convex. Set CLERK_ISSUER_URL or NEXT_PUBLIC_CLERK_FRONTEND_API in the Convex env."
    );
}

export default {
    providers: [
        {
            domain: clerkDomain,
            // Use a fixed application ID so Convex CLI does not require CLERK_APPLICATION_ID in env.
            applicationID: "convex",
        },
    ],
};
