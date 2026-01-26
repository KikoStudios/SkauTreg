"use client";

import { useConvexAuth } from "convex/react";
import Sidebar from "../../components/Sidebar";
import { useEffect, useState } from "react";
import { ProfileModalProvider } from "../../context/ProfileModalContext";
import styles from "./DashboardLayout.module.css";
import ProfileModal from "../../components/ProfileModal";
import { CommandMenu } from "../../components/CommandMenu";
import Breadcrumbs from "../../components/Breadcrumbs";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated } = useConvexAuth();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        console.log("DashboardLayout auth check:", { isLoading, isAuthenticated });
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                Loading...
            </div>
        );
    }

    // Prevent flash of unauthenticated content
    if (!isAuthenticated) {
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

                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                <CommandMenu />

                <main className={styles.mainContent}>
                    <Breadcrumbs />
                    {children}
                </main>
                <ProfileModal />
            </div>
        </ProfileModalProvider>
    );
}
