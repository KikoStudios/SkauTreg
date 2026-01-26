"use client";
import React from 'react';
import Link from 'next/link';
import { useProfileModal } from "../context/ProfileModalContext";
import styles from './Sidebar.module.css';

const navItems = [
    { label: 'Domů', icon: <img src="/icons/home-icon.svg" alt="Domů" style={{ width: "24px", height: "auto" }} />, active: true, href: '/' },
    { label: 'Můj Oddíl', icon: <img src="/icons/oddil-icon.svg" alt="Můj Oddíl" style={{ width: "24px", height: "auto" }} />, href: '/troop' },
    { label: 'Členové', icon: <img src="/icons/clenove-icon.svg" alt="Členové" style={{ width: "24px", height: "auto" }} />, href: '/members' },
    { label: 'Výpravy', icon: <img src="/icons/vypravy-icon.svg" alt="Výpravy" style={{ width: "24px", height: "auto" }} />, href: '/trips' },
    { label: 'Kalendář', icon: <img src="/icons/kalendar-white.svg" alt="Kalendář" style={{ width: "24px", height: "auto" }} />, href: '/calendar' },
];

const bottomItems = [
    { label: 'Nastavení', icon: <img src="/icons/nastaveni-icon.svg" alt="Nastavení" style={{ width: "24px", height: "auto" }} />, href: '/settings' },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const { openProfile } = useProfileModal();

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
                onClick={onClose}
            />

            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.logoArea}>
                    <img src="/Logo-light.svg" alt="SkautReg" style={{ height: '32px', width: 'auto', maxWidth: '100%' }} />
                    {/* Close button for mobile */}
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <nav className={styles.nav}>
                    <ul className={styles.navList}>
                        {navItems.map((item) => (
                            <li key={item.label}>
                                <Link
                                    href={item.href || '#'}
                                    className={`${styles.navItem} ${item.active ? styles.active : ''}`}
                                    onClick={onClose} // Close sidebar on nav
                                >
                                    <span className={styles.icon}>{item.icon}</span>
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Separator similar to reference image */}
                    <div className={styles.separator} />

                    <ul className={styles.navList}>
                        {bottomItems.map((item) => (
                            <li key={item.label}>
                                <Link
                                    href={item.href || '#'}
                                    className={styles.navItem}
                                    onClick={onClose}
                                >
                                    <span className={styles.icon}>{item.icon}</span>
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <button
                                onClick={() => {
                                    openProfile();
                                    if (onClose) onClose();
                                }}
                                className={styles.navItem}
                            >
                                <span className={styles.icon}>
                                    <img src="/icons/ucet-icon.svg" alt="Profile" style={{ width: "24px", height: "auto" }} />
                                </span>
                                View Profile
                            </button>
                        </li>
                    </ul>
                </nav>
            </aside>
        </>
    );
}
