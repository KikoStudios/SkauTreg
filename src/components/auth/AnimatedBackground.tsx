"use client";

import React, { useEffect, useState } from 'react';
import styles from './AnimatedBackground.module.css';

interface AnimatedBackgroundProps {
    children: React.ReactNode;
}

export default function AnimatedBackground({ children }: AnimatedBackgroundProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent rendering until mounted to avoid hydration mismatch
    if (!mounted) {
        return (
            <div className={styles.background}>
                <div className={styles.content} />
            </div>
        );
    }

    return (
        <div className={styles.background}>
            <div className={styles.pattern} />
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
