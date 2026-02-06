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
    { label: 'Rady', icon: <img src="/icons/rady-icon-light.svg" alt="Rady" style={{ width: "24px", height: "auto" }} />, href: '/rady' },
    { label: 'Kalendář', icon: <img src="/icons/kalendar-white.svg" alt="Kalendář" style={{ width: "24px", height: "auto" }} />, href: '/calendar' },
];

const toolsItems = [
    { label: 'Vyhledávač Základen', icon: <img src="/icons/wall-light.svg" alt="Vyhledávač" style={{ width: "24px", height: "auto" }} />, href: '/tools' },
];

const bottomItems = [
    { label: 'Nastavení', icon: <img src="/icons/nastaveni-icon.svg" alt="Nastavení" style={{ width: "24px", height: "auto" }} />, href: '/settings' },
    { label: 'Nápady & Chyby', icon: <img src="/icons/upload-icon.svg" alt="Nápady" style={{ width: "24px", height: "auto" }} />, href: '/fae' },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen = false, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
    const { openProfile } = useProfileModal();

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
                onClick={onClose}
            />

            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''} ${isCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.logoArea}>
                    <img src="/Logo-light.svg" alt="SkautReg" style={{ width: '100%', height: 'auto', maxWidth: '180px' }} />
                    {/* Close button for mobile */}
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                {/* Desktop collapse toggle button */}
                <button className={styles.collapseButton} onClick={onToggleCollapse} title={isCollapsed ? "Rozbalit sidebar" : "Skrýt sidebar"}>
                    {isCollapsed ? '›' : '‹'}
                </button>

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

                    {/* Tools Separator */}
                    <div className={styles.separator} />

                    <div className={styles.sectionLabel}>Nástroje</div>
                    <ul className={styles.navList}>
                        {toolsItems.map((item) => (
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
                    </ul>

                    {/* Settings Separator */}
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
                                    <img src="/icons/ucet-icon.svg" alt="Profile" style={{ width: "32px", height: "auto" }} />
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
