"use client";

import { useConvexAuth } from "convex/react";
import { useAuth, useClerk } from "@clerk/nextjs";
import Sidebar from "../../components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { ProfileModalProvider } from "../../context/ProfileModalContext";
import { SidebarProvider, useSidebar } from "../../context/SidebarContext";
import styles from "./DashboardLayout.module.css";
import ProfileModal from "../../components/ProfileModal";
import { CommandMenu } from "../../components/CommandMenu";
import Breadcrumbs from "../../components/Breadcrumbs";
import { UpdateNotification } from "../../components/UpdateNotification";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </SidebarProvider>
    );
}

function DashboardLayoutInner({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
    const { signOut } = useClerk();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isSidebarCollapsed, setIsSidebarCollapsed } = useSidebar();

    const convexAuthReady = useMemo(() => !isLoading && isAuthenticated, [isLoading, isAuthenticated]);

    useEffect(() => {
        console.log("DashboardLayout auth check:", { isLoading, isAuthenticated, isClerkLoaded, isSignedIn });
    }, [isLoading, isAuthenticated, isClerkLoaded, isSignedIn]);

    if (isLoading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                Loading...
            </div>
        );
    }

    // If Clerk is loaded and user is not signed in, bounce to sign-in for safety
    if (isClerkLoaded && !isSignedIn) {
        if (typeof window !== "undefined") {
            window.location.href = "/sign-in";
        }
        return null;
    }

    // Surface a clear error when Clerk session exists but Convex auth failed
    if (isClerkLoaded && isSignedIn && !convexAuthReady) {
        return (
            <div style={{ padding: "2rem", maxWidth: 600, margin: "4rem auto", textAlign: "center" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Unable to load dashboard</h2>
                <p style={{ color: "#4b5563", marginBottom: "1.5rem" }}>
                    Your Clerk session is active, but Convex authentication failed. This could mean:
                    <br />
                    • Convex service is down or misconfigured
                    <br />
                    • CLERK_ISSUER_URL not set in Convex environment
                    <br />
                    • NEXT_PUBLIC_CONVEX_URL not set correctly
                </p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: "0.75rem 1.5rem",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => signOut()}
                        style={{
                            padding: "0.75rem 1.5rem",
                            border: "1px solid #ef4444",
                            color: "#ef4444",
                            borderRadius: "8px",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </div>
        );
    }

    if (!convexAuthReady) {
        return null;
    }

    return (
        <ProfileModalProvider>
            <div className={styles.container}>
                {/* Mobile Header */}
                <div className={styles.mobileHeader}>
                    <button className={styles.hamburgerButton} onClick={() => setIsSidebarOpen(true)}>
                        ☰
                    </button>
                    <img src="/Logo-light.svg" alt="SkautReg" className={styles.mobileLogo} />
                    <div style={{ width: "40px" }}></div> {/* Spacer for balancing */}
                </div>

                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />

                {/* Desktop Sidebar Expand Button */}
                {isSidebarCollapsed && (
                    <button 
                        className={styles.expandButton}
                        onClick={() => setIsSidebarCollapsed(false)}
                        title="Rozbalit sidebar"
                    >
                        ‹
                    </button>
                )}

                <CommandMenu />
                <UpdateNotification />

                <main className={`${styles.mainContent} ${isSidebarCollapsed ? styles.mainContentExpanded : ''}`}>
                    {children}
                </main>
                <ProfileModal />
            </div>
        </ProfileModalProvider>
    );
}
