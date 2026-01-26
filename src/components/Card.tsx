import Link from 'next/link';
import styles from './Card.module.css';

interface CardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    status?: 'completed' | 'pending';
    href?: string;
}

export default function Card({ title, description, icon, status = 'pending', href = '#' }: CardProps) {
    return (
        <Link href={href} className={styles.card}>
            <div className={styles.status}>
                {status === 'completed' ? (
                    <div className={`${styles.statusIcon} ${styles.completed}`}>
                        <img src="/checkmark-icon.svg" alt="completed" style={{ width: '18px', height: '18px', filter: 'brightness(0) invert(1)' }} />
                    </div>
                ) : (
                    <div className={styles.statusIcon} />
                )}
            </div>

            <div className={styles.content}>
                <div className={styles.mainIcon}>{icon}</div>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>
            </div>
        </Link >
    );
}
