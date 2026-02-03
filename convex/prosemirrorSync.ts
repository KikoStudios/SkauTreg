// convex/prosemirrorSync.ts
import { components } from "./_generated/api";
import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);

// Export the sync API for pages (documents)
export const {
    getSnapshot,
    submitSnapshot,
    latestVersion,
    getSteps,
    submitSteps,
} = prosemirrorSync.syncApi({
    // You can add custom options here if needed
});
