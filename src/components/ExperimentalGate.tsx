"use client";

import { ReactNode, useState, isValidElement, cloneElement } from "react";
import styles from "./ExperimentalGate.module.css";

interface ExperimentalGateProps {
    children: ReactNode;
    trigger?: ReactNode;
    title?: string;
    message?: string;
    acknowledgeLabel?: string;
    cancelLabel?: string;
    onAcknowledge?: () => void;
    onCancel?: () => void;
    initialOpen?: boolean;
    badgeText?: string;
}

const DEFAULT_TITLE = "Experimental feature";
const DEFAULT_MESSAGE = "This section is under development. Things may change or not work as expected.";
const DEFAULT_ACK_LABEL = "Continue anyway";
const DEFAULT_BADGE = "EXPERIMENTAL";

export default function ExperimentalGate({
    children,
    trigger,
    title = DEFAULT_TITLE,
    message = DEFAULT_MESSAGE,
    acknowledgeLabel = DEFAULT_ACK_LABEL,
    cancelLabel = "Go back",
    onAcknowledge,
    onCancel,
    initialOpen = true,
    badgeText = DEFAULT_BADGE,
}: ExperimentalGateProps) {
    const [isAcknowledged, setIsAcknowledged] = useState(!trigger && !initialOpen);
    const [isOpen, setIsOpen] = useState(trigger ? false : initialOpen);

    const handleAcknowledge = () => {
        if (onAcknowledge) {
            onAcknowledge();
        }
        setIsAcknowledged(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        setIsOpen(false);
    };

    const modal = (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <div className={styles.modal}>
                <div className={styles.badge}>{badgeText}</div>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    {onCancel && (
                        <button className={`${styles.button} ${styles.secondary}`} onClick={handleCancel}>
                            {cancelLabel}
                        </button>
                    )}
                    <button className={`${styles.button} ${styles.primary}`} onClick={handleAcknowledge}>
                        {acknowledgeLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    if (trigger) {
        if (isAcknowledged) {
            return <>{children}</>;
        }

        const triggerNode = isValidElement(trigger)
            ? cloneElement(trigger, {
                onClick: (event: React.MouseEvent) => {
                    if (typeof trigger.props.onClick === "function") {
                        trigger.props.onClick(event);
                    }
                    setIsOpen(true);
                },
            })
            : (
                <button type="button" className={styles.triggerButton} onClick={() => setIsOpen(true)}>
                    {trigger}
                </button>
            );

        return (
            <>
                {triggerNode}
                {isOpen ? modal : null}
            </>
        );
    }

    if (!isOpen) {
        return <>{children}</>;
    }

    return modal;
}
