"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
    Camera,
    ChevronRight,
    CircleUserRound,
    ContactRound,
    LogOut,
    Save,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useProfileModal } from "../context/ProfileModalContext";
import { useFeedback } from "../context/FeedbackContext";
import styles from "./ProfileModal.module.css";

const BENEFIT_OPTIONS = [
    "žákovský průkaz ČR",
    "karta ISIC",
    "karta ITIC",
    "karta ALIVE",
    "karta EYCA (EURO<26)",
    "potvrzení o studiu",
    "průkaz ZTP",
    "průkaz ZTP/P",
    "průvodce ZTP/P",
    "průkaz ŤZP",
    "průkaz ŤZP/S",
    "průvodce ŤZP/S",
    "JUNIOR (ZSSK)",
    "průkaz rodiče pro ústavy",
];

type Section = "account" | "personal" | "contacts" | "roles";

const ROLE_LABELS: Record<string, string> = {
    owner: "Vlastník oddílu",
    main_leader: "Hlavní vedoucí",
    leader: "Vedoucí",
    rover: "Rover",
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object") {
        const maybeError = error as { message?: string; errors?: Array<{ message?: string }> };
        return maybeError.errors?.[0]?.message || maybeError.message || fallback;
    }
    return fallback;
};

export default function ProfileModal() {
    const { isOpen, closeProfile } = useProfileModal();
    const { user } = useUser();
    const { signOut } = useClerk();
    const profile = useQuery(api.users.profileOverview, {});
    const updateViewer = useMutation(api.users.update);
    const { showError, showSuccess } = useFeedback();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeSection, setActiveSection] = useState<Section>("account");
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [benefit, setBenefit] = useState("");
    const [address, setAddress] = useState("");
    const [personalEmail, setPersonalEmail] = useState("");
    const [personalPhone, setPersonalPhone] = useState("");
    const [emergencyContactName, setEmergencyContactName] = useState("");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
    const [emergencyContactEmail, setEmergencyContactEmail] = useState("");
    const [parent1Name, setParent1Name] = useState("");
    const [parent1Phone, setParent1Phone] = useState("");
    const [parent1Email, setParent1Email] = useState("");
    const [parent2Name, setParent2Name] = useState("");
    const [parent2Phone, setParent2Phone] = useState("");
    const [parent2Email, setParent2Email] = useState("");
    const [password, setPassword] = useState("");

    const viewer = profile?.user;
    const roles = profile?.roles || [];
    const usernameChanged = Boolean(user && username !== (user.username || ""));

    const resetForm = useCallback(() => {
        setFirstName(user?.firstName || "");
        setLastName(user?.lastName || "");
        setUsername(user?.username || "");
        setDateOfBirth(viewer?.birthDate || viewer?.dateOfBirth || (user?.unsafeMetadata?.dateOfBirth as string) || "");
        setBenefit(viewer?.benefit || (user?.unsafeMetadata?.benefit as string) || "");
        setAddress(viewer?.address || "");
        setPersonalEmail(viewer?.personalEmail || "");
        setPersonalPhone(viewer?.personalPhone || "");
        setEmergencyContactName(viewer?.emergencyContactName || "");
        setEmergencyContactPhone(viewer?.emergencyContactPhone || "");
        setEmergencyContactEmail(viewer?.emergencyContactEmail || "");
        setParent1Name(viewer?.parent1Name || "");
        setParent1Phone(viewer?.parent1Phone || "");
        setParent1Email(viewer?.parent1Email || "");
        setParent2Name(viewer?.parent2Name || "");
        setParent2Phone(viewer?.parent2Phone || "");
        setParent2Email(viewer?.parent2Email || "");
        setPassword("");
    }, [user, viewer]);

    useEffect(() => {
        if (isOpen) resetForm();
    }, [isOpen, resetForm]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isSaving) closeProfile();
        };
        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [closeProfile, isOpen, isSaving]);

    const completedFields = useMemo(() => {
        const values = [firstName, lastName, dateOfBirth, address, personalEmail, personalPhone];
        return values.filter((value) => value.trim()).length;
    }, [address, dateOfBirth, firstName, lastName, personalEmail, personalPhone]);
    const completion = Math.round((completedFields / 6) * 100);

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) return;
        if (!firstName.trim() || !lastName.trim()) {
            setActiveSection("personal");
            showError({ title: "Doplňte jméno", message: "Jméno a příjmení pomáhá ostatním poznat, kdo jste.", icon: "warning", canReport: false });
            return;
        }
        if (usernameChanged && !password) {
            setActiveSection("account");
            showError({ title: "Chybí heslo", message: "Změnu uživatelského jména potvrďte heslem.", icon: "warning", canReport: false });
            return;
        }

        setIsSaving(true);
        try {
            const clerkUpdate: Record<string, unknown> = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                unsafeMetadata: { ...user.unsafeMetadata, dateOfBirth, benefit },
            };
            if (usernameChanged) {
                clerkUpdate.username = username.trim();
                clerkUpdate.password = password;
            }
            await user.update(clerkUpdate);
            await updateViewer({
                name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                dateOfBirth: dateOfBirth || undefined,
                birthDate: dateOfBirth || undefined,
                benefit: benefit || undefined,
                address: address.trim() || undefined,
                personalEmail: personalEmail.trim() || undefined,
                personalPhone: personalPhone.trim() || undefined,
                emergencyContactName: emergencyContactName.trim() || undefined,
                emergencyContactPhone: emergencyContactPhone.trim() || undefined,
                emergencyContactEmail: emergencyContactEmail.trim() || undefined,
                parent1Name: parent1Name.trim() || undefined,
                parent1Phone: parent1Phone.trim() || undefined,
                parent1Email: parent1Email.trim() || undefined,
                parent2Name: parent2Name.trim() || undefined,
                parent2Phone: parent2Phone.trim() || undefined,
                parent2Email: parent2Email.trim() || undefined,
            });
            setPassword("");
            showSuccess({ title: "Profil uložen", message: "Změny jsou dostupné ve všech oddílech a výpravách.", duration: 2500 });
        } catch (error) {
            showError({ title: "Uložení se nepovedlo", message: getErrorMessage(error, "Nepodařilo se uložit profil."), icon: "error", canReport: true });
        } finally {
            setIsSaving(false);
        }
    };

    const resizeImage = (file: File, maxSize = 800): Promise<Blob> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const image = new Image();
            image.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);
                const context = canvas.getContext("2d");
                if (!context) return reject(new Error("Obrázek se nepodařilo zpracovat."));
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Obrázek se nepodařilo zpracovat.")), "image/jpeg", 0.86);
            };
            image.onerror = () => reject(new Error("Obrázek se nepodařilo načíst."));
            image.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Soubor se nepodařilo načíst."));
        reader.readAsDataURL(file);
    });

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        if (!file.type.startsWith("image/")) {
            showError({ title: "Neplatný soubor", message: "Vyberte obrázek ve formátu JPG, PNG nebo WebP.", icon: "warning", canReport: false });
            return;
        }
        setIsUploadingImage(true);
        try {
            const resized = await resizeImage(file);
            await user.setProfileImage({ file: new File([resized], file.name, { type: "image/jpeg" }) });
            showSuccess({ title: "Fotka změněna", message: "Nová profilová fotka je uložená.", duration: 1800 });
        } catch (error) {
            showError({ title: "Nahrání se nepovedlo", message: getErrorMessage(error, "Nepodařilo se nahrát obrázek."), icon: "error", canReport: true });
        } finally {
            setIsUploadingImage(false);
            event.target.value = "";
        }
    };

    if (!isOpen) return null;

    const navigation = [
        { id: "account" as const, label: "Účet", hint: "Přihlášení a fotka", Icon: CircleUserRound },
        { id: "personal" as const, label: "Osobní údaje", hint: "Jméno, narození, adresa", Icon: UserRound },
        { id: "contacts" as const, label: "Kontakty", hint: "Telefon, nouzové kontakty", Icon: ContactRound },
        { id: "roles" as const, label: "Moje oddíly", hint: `${roles.length} ${roles.length === 1 ? "role" : "rolí"}`, Icon: UsersRound },
    ];

    return (
        <div className={styles.modalOverlay} onMouseDown={(event) => event.target === event.currentTarget && closeProfile()}>
            <div className={styles.profileCard} role="dialog" aria-modal="true" aria-labelledby="profile-title">
                <header className={styles.profileHeader}>
                    <div className={styles.profileIdentity}>
                        <div className={styles.avatarWrap}>
                            <img src={user?.imageUrl || "/default-profile.svg"} alt="Profilová fotka" className={styles.userAvatar} />
                            <button type="button" className={styles.avatarUploadButton} onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} aria-label="Změnit profilovou fotku">
                                {isUploadingImage ? <span className={styles.spinner} /> : <Camera size={14} />}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} hidden />
                        </div>
                        <div>
                            <h2 id="profile-title" className={styles.profileTitle}>{user?.fullName || "Můj profil"}</h2>
                            <span>{user?.primaryEmailAddress?.emailAddress || ""}</span>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <span className={styles.completion}>{completion} % vyplněno</span>
                        <button type="button" className={styles.closeButton} onClick={closeProfile} aria-label="Zavřít profil"><X size={20} /></button>
                    </div>
                </header>

                <form className={styles.profileLayout} onSubmit={handleSave}>
                    <nav className={styles.sectionNav} aria-label="Sekce profilu">
                            {navigation.map(({ id, label, Icon }) => (
                                <button type="button" key={id} className={activeSection === id ? styles.sectionNavActive : ""} onClick={() => setActiveSection(id)}>
                                    <Icon size={17} /><span>{label}</span>{id === "roles" && roles.length > 0 && <em>{roles.length}</em>}
                                </button>
                            ))}
                    </nav>

                    <main className={styles.content}>
                        {profile === undefined ? (
                            <div className={styles.loadingState}><span className={styles.spinner} /> Načítám profil…</div>
                        ) : activeSection === "account" ? (
                            <section className={styles.section}>
                                <SectionHeading title="Účet" />
                                <div className={styles.fieldGrid}>
                                <Field label="Uživatelské jméno">
                                    <input className={styles.input} value={username} onChange={(event) => { setUsername(event.target.value); if (event.target.value === (user?.username || "")) setPassword(""); }} placeholder="např. jan.novak" autoComplete="username" />
                                </Field>
                                <Field label="Přihlašovací e-mail"><input className={styles.input} value={user?.primaryEmailAddress?.emailAddress || ""} disabled /></Field>
                                {usernameChanged && <Field label="Potvrďte heslem" wide><input className={styles.input} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></Field>}
                                </div>
                            </section>
                        ) : activeSection === "personal" ? (
                            <section className={styles.section}>
                                <SectionHeading title="Osobní údaje" />
                                <div className={styles.fieldGrid}>
                                    <Field label="Jméno" required><input className={styles.input} value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" /></Field>
                                    <Field label="Příjmení" required><input className={styles.input} value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" /></Field>
                                    <Field label="Datum narození"><input className={styles.input} type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} max={new Date().toISOString().split("T")[0]} /></Field>
                                    <Field label="Benefit pro dopravu"><select className={styles.input} value={benefit} onChange={(event) => setBenefit(event.target.value)}><option value="">Bez benefitu</option>{BENEFIT_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></Field>
                                    <Field label="Adresa" hint="Ulice, město, PSČ" wide><input className={styles.input} value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" placeholder="např. Junácká 12, Praha" /></Field>
                                </div>
                            </section>
                        ) : activeSection === "contacts" ? (
                            <section className={styles.section}>
                                <SectionHeading title="Kontakty" />
                                <ContactGroup title="Můj kontakt">
                                    <Field label="Kontaktní e-mail"><input className={styles.input} type="email" value={personalEmail} onChange={(event) => setPersonalEmail(event.target.value)} autoComplete="email" placeholder="vas@email.cz" /></Field>
                                    <Field label="Telefon"><input className={styles.input} type="tel" value={personalPhone} onChange={(event) => setPersonalPhone(event.target.value)} autoComplete="tel" placeholder="+420 123 456 789" /></Field>
                                </ContactGroup>
                                <ContactGroup title="Nouzový kontakt">
                                    <Field label="Jméno"><input className={styles.input} value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} /></Field>
                                    <Field label="Telefon"><input className={styles.input} type="tel" value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} /></Field>
                                    <Field label="E-mail" wide><input className={styles.input} type="email" value={emergencyContactEmail} onChange={(event) => setEmergencyContactEmail(event.target.value)} /></Field>
                                </ContactGroup>
                                <ContactGroup title="Rodiče / zákonní zástupci">
                                    <Field label="Rodič 1 – jméno"><input className={styles.input} value={parent1Name} onChange={(event) => setParent1Name(event.target.value)} /></Field>
                                    <Field label="Rodič 1 – telefon"><input className={styles.input} type="tel" value={parent1Phone} onChange={(event) => setParent1Phone(event.target.value)} /></Field>
                                    <Field label="Rodič 1 – e-mail" wide><input className={styles.input} type="email" value={parent1Email} onChange={(event) => setParent1Email(event.target.value)} /></Field>
                                    <Field label="Rodič 2 – jméno"><input className={styles.input} value={parent2Name} onChange={(event) => setParent2Name(event.target.value)} /></Field>
                                    <Field label="Rodič 2 – telefon"><input className={styles.input} type="tel" value={parent2Phone} onChange={(event) => setParent2Phone(event.target.value)} /></Field>
                                    <Field label="Rodič 2 – e-mail" wide><input className={styles.input} type="email" value={parent2Email} onChange={(event) => setParent2Email(event.target.value)} /></Field>
                                </ContactGroup>
                            </section>
                        ) : (
                            <section className={styles.section}>
                                <SectionHeading title="Moje oddíly" />
                                {roles.length ? <div className={styles.roleList}>{roles.map((role) => <article className={styles.roleCard} key={role.troopId}><div className={styles.roleIcon}><UsersRound size={21} /></div><div><strong>{role.troopName}</strong><span>{ROLE_LABELS[role.role] || role.role}</span></div><Link href={`/troop/${role.troopId}/leaders`} onClick={closeProfile}>Otevřít vedení <ChevronRight size={16} /></Link></article>)}</div> : <div className={styles.emptyState}><UsersRound size={28} /><strong>Zatím nejste ve vedení žádného oddílu</strong><span>Až vás někdo přidá, role se zde objeví automaticky.</span></div>}
                            </section>
                        )}
                    </main>

                    <footer className={styles.footer}>
                        <button type="button" className={styles.signOutButton} onClick={() => signOut({ redirectUrl: "/sign-in" })}><LogOut size={16} /> Odhlásit se</button>
                        <div><button type="button" className={styles.secondaryButton} onClick={() => { resetForm(); closeProfile(); }} disabled={isSaving}>Zrušit</button><button type="submit" className={styles.primaryButton} disabled={isSaving || profile === undefined}>{isSaving ? <span className={styles.spinner} /> : <Save size={16} />}{isSaving ? "Ukládám…" : "Uložit"}</button></div>
                    </footer>
                </form>
            </div>
        </div>
    );
}

function SectionHeading({ title }: { title: string }) {
    return <div className={styles.sectionHeading}><h3>{title}</h3></div>;
}

function Field({ label, hint, required, wide, children }: { label: string; hint?: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
    return <label className={`${styles.field} ${wide ? styles.fieldWide : ""}`}><span>{label}{required && <em> *</em>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function ContactGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return <div className={styles.contactGroup}><div className={styles.contactGroupHeading}><strong>{title}</strong></div><div className={styles.fieldGrid}>{children}</div></div>;
}
