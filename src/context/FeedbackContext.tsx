"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ErrorModalConfig {
    title?: string;
    message: string;
    details?: string;
    icon?: "error" | "warning" | "info";
    buttons?: Array<{
        label: string;
        onClick: () => void;
        variant?: "primary" | "secondary" | "danger";
    }>;
    onClose?: () => void;
    canReport?: boolean; // Show "Send for review" button
}

export interface SuccessModalConfig {
    title?: string;
    message: string;
    icon?: string;
    duration?: number; // Auto-close after ms (0 = no auto-close)
    onClose?: () => void;
}

interface FeedbackContextType {
    showError: (config: ErrorModalConfig) => void;
    showSuccess: (config: SuccessModalConfig) => void;
    closeError: () => void;
    closeSuccess: () => void;
    errorConfig: ErrorModalConfig | null;
    successConfig: SuccessModalConfig | null;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [errorConfig, setErrorConfig] = useState<ErrorModalConfig | null>(null);
    const [successConfig, setSuccessConfig] = useState<SuccessModalConfig | null>(null);

    const showError = useCallback((config: ErrorModalConfig) => {
        setErrorConfig(config);
    }, []);

    const closeError = useCallback(() => {
        setErrorConfig(null);
    }, []);

    const showSuccess = useCallback((config: SuccessModalConfig) => {
        setSuccessConfig(config);
        if (config.duration !== 0) {
            const timeout = setTimeout(() => {
                setSuccessConfig(null);
            }, config.duration || 3000);
            return () => clearTimeout(timeout);
        }
    }, []);

    const closeSuccess = useCallback(() => {
        setSuccessConfig(null);
    }, []);

    return (
        <FeedbackContext.Provider value={{
            showError,
            showSuccess,
            closeError,
            closeSuccess,
            errorConfig,
            successConfig,
        }}>
            {children}
        </FeedbackContext.Provider>
    );
}

export function useFeedback() {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error("useFeedback must be used within FeedbackProvider");
    }
    return context;
}
