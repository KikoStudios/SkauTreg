import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/rsvp(.*)",
    "/api/public(.*)"
]);

const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/calendar(.*)",
    "/members(.*)",
    "/settings(.*)",
    "/trips(.*)",
    "/troop(.*)"
]);

export default clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
        await auth.protect({
            unauthenticatedUrl: "/sign-in",
            unauthorizedUrl: "/sign-in"
        });
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
