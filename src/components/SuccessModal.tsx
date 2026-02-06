"use client";

import { useFeedback } from "@/context/FeedbackContext";
import { useEffect } from "react";
import styles from "./SuccessModal.module.css";

export default function SuccessModal() {
    const { successConfig, closeSuccess } = useFeedback();

    useEffect(() => {
        if (successConfig && successConfig.duration !== 0) {
            const timer = setTimeout(closeSuccess, successConfig.duration || 3000);
            return () => clearTimeout(timer);
        }
    }, [successConfig, closeSuccess]);

    if (!successConfig) return null;

    return (
        <div className={styles.container}>
            <div className={styles.toast}>
                <div className={styles.content}>
                    <span className={styles.icon}>
                        <img src="/icons/home-icon.svg" alt="success" style={{ width: "20px", height: "20px" }} />
                    </span>
                    <div className={styles.text}>
                        {successConfig.title && (
                            <div className={styles.title}>{successConfig.title}</div>
                        )}
                        <div className={styles.message}>{successConfig.message}</div>
                    </div>
                </div>
                <button className={styles.closeBtn} onClick={closeSuccess}>
                    ✕
                </button>
            </div>
        </div>
    );
}
