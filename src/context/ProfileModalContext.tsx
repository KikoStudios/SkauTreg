"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface ProfileModalContextType {
    isOpen: boolean;
    openProfile: () => void;
    closeProfile: () => void;
}

const ProfileModalContext = createContext<ProfileModalContextType | undefined>(undefined);

export function ProfileModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const openProfile = () => setIsOpen(true);
    const closeProfile = () => setIsOpen(false);

    return (
        <ProfileModalContext.Provider value={{ isOpen, openProfile, closeProfile }}>
            {children}
        </ProfileModalContext.Provider>
    );
}

export function useProfileModal() {
    const context = useContext(ProfileModalContext);
    if (context === undefined) {
        throw new Error("useProfileModal must be used within a ProfileModalProvider");
    }
    return context;
}
