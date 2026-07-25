"use client";

import { useConvexAuth } from "convex/react";
import { useAuth, useClerk } from "@clerk/nextjs";
import Sidebar from "../../components/Sidebar";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ProfileModalProvider } from "../../context/ProfileModalContext";
import { SidebarProvider, useSidebar } from "../../context/SidebarContext";
import styles from "./DashboardLayout.module.css";
import ProfileModal from "../../components/ProfileModal";
import { CommandMenu } from "../../components/CommandMenu";
import { UpdateNotification } from "../../components/UpdateNotification";
import { ChevronRight, Menu } from "lucide-react";

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
    const router = useRouter();
    const pathname = usePathname();
    const isTripWorkspace = /^\/trips\/[^/]+/.test(pathname || "");

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isSidebarCollapsed, setIsSidebarCollapsed } = useSidebar();

    const convexAuthReady = useMemo(() => !isLoading && isAuthenticated, [isLoading, isAuthenticated]);

    useEffect(() => {
        if (isClerkLoaded && !isSignedIn) {
            router.replace("/sign-in");
        }
    }, [isClerkLoaded, isSignedIn, router]);

    if (isLoading) {
        return (
            <div className={styles.statusScreen} role="status">
                <div className={styles.loadingMark} />
                <strong>Načítám váš pracovní prostor…</strong>
            </div>
        );
    }

    // If Clerk is loaded and user is not signed in, bounce to sign-in for safety
    if (isClerkLoaded && !isSignedIn) {
        return null;
    }

    // Surface a clear error when Clerk session exists but Convex auth failed
    if (isClerkLoaded && isSignedIn && !convexAuthReady) {
        return (
            <div className={styles.statusScreen}>
              <div className={styles.statusCard}>
                <span className={styles.statusEyebrow}>Problém s připojením</span>
                <h2>Pracovní prostor se nepodařilo načíst</h2>
                <p>
                    Relace Clerk je aktivní, ale ověření Convex selhalo. Může to znamenat:
                    <br />
                    • služba Convex neběží nebo je špatně nastavená
                    <br />
                    • v prostředí Convex chybí CLERK_ISSUER_URL
                    <br />
                    • NEXT_PUBLIC_CONVEX_URL není nastavená správně
                </p>
                <div className={styles.statusActions}>
                    <button
                        onClick={() => window.location.reload()}
                    >
                        Zkusit znovu
                    </button>
                    <button
                        onClick={() => signOut()}
                    >
                        Odhlásit se
                    </button>
                </div>
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
                {!isTripWorkspace && <Sidebar
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />}
                {!isTripWorkspace && <button className={styles.mobileMenuButton} onClick={() => setIsSidebarOpen(true)} aria-label="Otevřít navigaci"><Menu size={22} /></button>}

                {/* Desktop Sidebar Expand Button */}
                {isSidebarCollapsed && !isTripWorkspace && (
                    <button 
                        className={styles.expandButton}
                        onClick={() => setIsSidebarCollapsed(false)}
                        title="Rozbalit sidebar"
                    >
                        <ChevronRight size={28} strokeWidth={3} />
                    </button>
                )}

                <CommandMenu />
                <UpdateNotification />

                <main className={`${styles.mainContent} ${isSidebarCollapsed || isTripWorkspace ? styles.mainContentExpanded : ''}`}>
                    {children}
                </main>
                <ProfileModal />
            </div>
        </ProfileModalProvider>
    );
}
