"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import {
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CircleUserRound,
    Compass,
    FileText,
    FolderKanban,
    House,
    Lightbulb,
    MapPinned,
    Search,
    Settings,
    TentTree,
    Users,
    X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useProfileModal } from "../context/ProfileModalContext";
import styles from "./Sidebar.module.css";

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

type ProjectItem = {
    label: string;
    Icon: typeof House;
    href: string;
    activePath?: string;
    exact?: boolean;
    children?: Array<{ label: string; href: string }>;
};

const globalItems = [
    { label: "Přehled", Icon: House, href: "/home" },
    { label: "Všechny oddíly", Icon: FolderKanban, href: "/troop" },
    { label: "Kalendář", Icon: CalendarDays, href: "/calendar" },
];

export default function Sidebar({ isOpen = false, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const troops = useQuery(api.troops.getByUser) || [];
    const { openProfile } = useProfileModal();
    const [floatingMenu, setFloatingMenu] = useState<{ top: number; left: number; label: string; children: Array<{ label: string; href: string }> } | null>(null);
    const closeMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const routeTroopId = pathname?.match(/^\/troop\/([^/]+)/)?.[1] || pathname?.match(/^\/settings\/([^/]+)/)?.[1] || searchParams.get("troopId");
    const activeTroop = troops.find((troop) => troop._id === routeTroopId) || troops[0];

    const isActive = (href: string, exact = false) => exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);
    const close = () => onClose?.();
    const showSubmenu = (event: React.MouseEvent<HTMLElement>, label: string, children: Array<{ label: string; href: string }>) => {
        if (window.innerWidth <= 768) return;
        if (closeMenuTimer.current) clearTimeout(closeMenuTimer.current);
        const rect = event.currentTarget.getBoundingClientRect();
        const menuHeight = children.length * 36 + 16;
        setFloatingMenu({
            top: Math.max(8, Math.min(rect.top, window.innerHeight - menuHeight - 8)),
            left: rect.right + 6,
            label,
            children,
        });
    };
    const scheduleSubmenuClose = () => {
        closeMenuTimer.current = setTimeout(() => setFloatingMenu(null), 120);
    };
    const keepSubmenuOpen = () => {
        if (closeMenuTimer.current) clearTimeout(closeMenuTimer.current);
    };

    const projectItems: ProjectItem[] = activeTroop ? [
        { label: "Přehled oddílu", Icon: Compass, href: `/troop/${activeTroop._id}`, exact: true },
        { label: "Členové", Icon: Users, href: `/members?troopId=${activeTroop._id}`, activePath: "/members" },
        { label: "Výpravy", Icon: TentTree, href: `/trips?troopId=${activeTroop._id}`, activePath: "/trips" },
        { label: "Dokumenty", Icon: FileText, href: `/troop/${activeTroop._id}/documents` },
        { label: "Vedení", Icon: CircleUserRound, href: `/troop/${activeTroop._id}/leaders` },
        {
            label: "Nastavení oddílu",
            Icon: Settings,
            href: `/settings/${activeTroop._id}?section=general`,
            activePath: `/settings/${activeTroop._id}`,
            children: [
                { label: "Základní údaje", href: `/settings/${activeTroop._id}?section=general` },
                { label: "Vzhled a logo", href: `/settings/${activeTroop._id}?section=branding` },
                { label: "E-mailové připojení", href: `/settings/${activeTroop._id}?section=gmail` },
                { label: "Nebezpečná zóna", href: `/settings/${activeTroop._id}?section=danger` },
            ],
        },
    ] : [];

    return (
        <>
            <div className={`${styles.overlay} ${isOpen ? styles.visible : ""}`} onClick={close} />
            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""} ${isCollapsed ? styles.collapsed : ""}`} aria-label="Hlavní navigace">
                <div className={styles.logoArea}>
                    <Link href="/" onClick={close} className={styles.logoLink} aria-label="SkautReg – přehled">
                        <img src="/Logo-light.svg" alt="SkautReg" className={styles.logoImage} />
                    </Link>
                    <button className={styles.closeButton} onClick={close} aria-label="Zavřít menu"><X size={24} strokeWidth={2.5} /></button>
                </div>

                <button className={styles.collapseButton} onClick={onToggleCollapse} title={isCollapsed ? "Rozbalit navigaci" : "Skrýt navigaci"}>
                    {isCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
                </button>

                <nav className={styles.nav}>
                    <div className={styles.navScroll}>
                        <button className={styles.sidebarSearch} onClick={() => window.dispatchEvent(new Event("skautreg:open-command"))}>
                            <Search size={18} strokeWidth={2.4} />
                            <span>Hledat v aplikaci</span>
                            <kbd>⌘K</kbd>
                        </button>
                        <div className={styles.sectionLabel}>Organizace</div>
                        <ul className={styles.navList}>
                            {globalItems.map(({ label, Icon, href }) => (
                                <li key={href}>
                                    <Link href={href} className={`${styles.navItem} ${isActive(href, href === "/home" || href === "/troop") ? styles.active : ""}`} onClick={close}>
                                        <Icon className={styles.icon} size={20} strokeWidth={2.25} />
                                        <span>{label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className={styles.projectSection}>
                            {activeTroop ? (
                                <>
                                <details className={styles.projectPicker}>
                                    <summary className={styles.projectSummary} title="Přepnout projekt">
                                        <span className={styles.projectMark}>
                                            {activeTroop.logo ? <img src={activeTroop.logo} alt="" /> : activeTroop.name.slice(0, 2).toUpperCase()}
                                        </span>
                                        <span className={styles.projectCopy}>
                                            <strong>{activeTroop.name}</strong>
                                            <small>Kliknutím přepnete projekt</small>
                                        </span>
                                        <ChevronDown className={styles.projectChevron} size={18} />
                                    </summary>
                                    <div className={styles.projectOptions}>
                                        {troops.map((troop) => (
                                            <Link key={troop._id} href={`/troop/${troop._id}`} onClick={close} className={troop._id === activeTroop._id ? styles.selectedProject : ""}>
                                                <span className={styles.optionMark}>{troop.logo ? <img src={troop.logo} alt="" /> : troop.name.slice(0, 2).toUpperCase()}</span>
                                                <span>{troop.name}</span>
                                                {troop._id === activeTroop._id && <small>Aktivní</small>}
                                            </Link>
                                        ))}
                                        <Link href="/troop?create=true" onClick={close} className={styles.addProject}>+ Nový oddíl</Link>
                                    </div>
                                </details>
                                    <ul className={`${styles.navList} ${styles.projectNav}`}>
                                        {projectItems.map(({ label, Icon, href, activePath, exact, children }) => (
                                            <li
                                                key={href}
                                                className={children ? styles.navWithSubmenu : undefined}
                                                onMouseEnter={children ? (event) => showSubmenu(event, label, children) : undefined}
                                                onMouseLeave={children ? scheduleSubmenuClose : undefined}
                                            >
                                                <Link href={href} className={`${styles.navItem} ${styles.projectItem} ${isActive(activePath || href, exact) ? styles.active : ""}`} onClick={close}>
                                                    <Icon className={styles.icon} size={19} strokeWidth={2.25} />
                                                    <span>{label}</span>
                                                    {children && <ChevronRight className={styles.submenuChevron} size={15} />}
                                                </Link>
                                                {children && <div className={styles.inlineSubmenu} aria-label={`Části: ${label}`}>
                                                    {children.map((child) => <Link key={child.href} href={child.href} onClick={close}>{child.label}</Link>)}
                                                </div>}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <Link href="/troop?create=true" className={styles.emptyProject} onClick={close}>
                                    <span>Vytvořte první oddíl</span>
                                    <ChevronRight size={18} />
                                </Link>
                            )}
                        </div>

                        <div className={styles.sectionLabel}>Nástroje</div>
                        <ul className={styles.navList}>
                            <li><Link href="/tools/basefinder" className={`${styles.navItem} ${isActive("/tools/basefinder") ? styles.active : ""}`} onClick={close}><MapPinned className={styles.icon} size={20} /><span>Vyhledávač základen</span></Link></li>
                            <li><Link href="/fae" className={`${styles.navItem} ${isActive("/fae") ? styles.active : ""}`} onClick={close}><Lightbulb className={styles.icon} size={20} /><span>Nápady a chyby</span></Link></li>
                        </ul>
                    </div>

                    <div className={styles.sidebarFooter}>
                        <button onClick={() => { openProfile(); close(); }} className={styles.profileButton}>
                            <span className={styles.profileAvatar}><CircleUserRound size={21} /></span>
                            <span><strong>Můj profil</strong><small>Účet a předvolby</small></span>
                            <ChevronRight size={17} />
                        </button>
                    </div>
                </nav>
            </aside>
            {floatingMenu && createPortal(
                <div
                    className={styles.floatingSubmenu}
                    style={{ top: floatingMenu.top, left: floatingMenu.left }}
                    aria-label={`Části: ${floatingMenu.label}`}
                    onMouseEnter={keepSubmenuOpen}
                    onMouseLeave={scheduleSubmenuClose}
                >
                    {floatingMenu.children.map((child) => (
                        <Link key={child.href} href={child.href} onClick={() => { setFloatingMenu(null); close(); }}>{child.label}</Link>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
}
