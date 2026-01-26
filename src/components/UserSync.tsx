"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export default function UserSync() {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const storeUser = useMutation(api.users.store);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            storeUser().catch((err) => console.error("Failed to sync user:", err));
        }
    }, [isLoading, isAuthenticated, storeUser]);

    return null;
}
