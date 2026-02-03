import styles from './MeetingRoom.module.css';

export default function MeetingRoomLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.container}>
            {children}
        </div>
    );
}
