import React from 'react';
import styles from './AnimatedBackground.module.css';

interface AnimatedBackgroundProps {
    children: React.ReactNode;
}

export default function AnimatedBackground({ children }: AnimatedBackgroundProps) {
    return (
        <div className={styles.background}>
            <div className={styles.pattern} />
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
