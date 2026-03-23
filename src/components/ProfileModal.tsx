"use client";
import React, { useRef, useState } from 'react';
import { useUser, useClerk } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useProfileModal } from "../context/ProfileModalContext";
import { useFeedback } from "../context/FeedbackContext";
import styles from './ProfileModal.module.css';

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
    const viewer = useQuery(api.users.viewer, {});
    const updateViewer = useMutation(api.users.update);
    const { showError, showSuccess } = useFeedback();
    const { signOut } = useClerk();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditing, setIsEditing] = useState(false);
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
    const [contactProfileType, setContactProfileType] = useState<"rover" | "leader">("leader");
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
    const [needsPasswordForUsername, setNeedsPasswordForUsername] = useState(false);
    const [activeSection, setActiveSection] = useState<"personal" | "contact" | "parents">("personal");

    const resetForm = React.useCallback(() => {
        setFirstName(user?.firstName || "");
        setLastName(user?.lastName || "");
        setUsername(user?.username || "");
        setDateOfBirth(viewer?.birthDate || viewer?.dateOfBirth || (user?.unsafeMetadata?.dateOfBirth as string) || "");
        setBenefit(viewer?.benefit || (user?.unsafeMetadata?.benefit as string) || "");
        setAddress(viewer?.address || "");
        setPersonalEmail(viewer?.personalEmail || "");
        setPersonalPhone(viewer?.personalPhone || "");
        setContactProfileType((viewer?.contactProfileType as "rover" | "leader" | undefined) || "leader");
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
        setNeedsPasswordForUsername(false);
        setActiveSection("personal");
    }, [user, viewer]);

    React.useEffect(() => {
        resetForm();
    }, [resetForm]);

    const handleCancel = () => {
        setIsEditing(false);
        resetForm();
    };

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!user) return;

        const usernameChanged = username !== user.username;

        if (usernameChanged && !password) {
            showError({
                title: "Chybí heslo",
                message: "Pro změnu uživatelského jména zadejte heslo.",
                icon: "warning",
                canReport: false,
            });
            return;
        }

        setIsSaving(true);

        try {
            const updateData: Record<string, unknown> = {
                firstName,
                lastName,
                unsafeMetadata: {
                    ...user.unsafeMetadata,
                    dateOfBirth,
                    benefit,
                },
            };

            if (usernameChanged) {
                updateData.username = username;
                updateData.password = password;
            }

            await user.update(updateData);
            await updateViewer({
                dateOfBirth: dateOfBirth || undefined,
                birthDate: dateOfBirth || undefined,
                benefit: benefit || undefined,
                address: address || undefined,
                personalEmail: personalEmail || undefined,
                personalPhone: personalPhone || undefined,
                contactProfileType,
                emergencyContactName: emergencyContactName || undefined,
                emergencyContactPhone: emergencyContactPhone || undefined,
                emergencyContactEmail: emergencyContactEmail || undefined,
                parent1Name: parent1Name || undefined,
                parent1Phone: parent1Phone || undefined,
                parent1Email: parent1Email || undefined,
                parent2Name: parent2Name || undefined,
                parent2Phone: parent2Phone || undefined,
                parent2Email: parent2Email || undefined,
            });

            setPassword("");
            setNeedsPasswordForUsername(false);
            setIsEditing(false);
            showSuccess({
                title: "Profil uložen",
                message: "Profil a kontakty byly aktualizovány.",
                duration: 2500,
            });
        } catch (err: unknown) {
            console.error("Failed to update profile", err);
            showError({
                title: "Uložení se nepovedlo",
                message: getErrorMessage(err, "Nepodařilo se uložit profil."),
                icon: "error",
                canReport: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const resizeImage = (file: File, maxSize: number = 800): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Failed to create blob'));
                            }
                        },
                        'image/jpeg',
                        0.85
                    );
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploadingImage(true);
        try {
            const resizedBlob = await resizeImage(file);
            const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });
            await user.setProfileImage({ file: resizedFile });
        } catch (err: unknown) {
            console.error("Failed to upload image", err);
            showError({
                title: "Nahrání se nepovedlo",
                message: getErrorMessage(err, "Nepodařilo se nahrát obrázek."),
                icon: "error",
                canReport: true,
            });
        } finally {
            setIsUploadingImage(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={closeProfile}>
            <div className={styles.profileCard} onClick={(e) => e.stopPropagation()}>
                <div className={styles.profileHeader}>
                    <h2 className={styles.profileTitle}>Můj Profil</h2>
                    <button className={styles.closeButton} onClick={closeProfile}>×</button>
                </div>

                <div className={styles.profileBody}>
                    <div className={styles.userInfo}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                                src={user?.imageUrl || "/default-profile.svg"}
                                alt="Profile"
                                className={styles.userAvatar}
                            />
                            {isEditing && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingImage}
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        backgroundColor: '#86efac',
                                        border: '4px solid #000',
                                        borderRadius: '50%',
                                        width: '40px',
                                        height: '40px',
                                        cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        boxShadow: '4px 4px 0 0 #000'
                                    }}
                                    title="Změnit profilový obrázek"
                                >
                                    {isUploadingImage ? '...' : <img src="/icons/upload-icon.svg" alt="upload" style={{ width: '18px', height: '18px', filter: 'brightness(0)' }} />}
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <div className={styles.userDetails}>
                            {!isEditing ? (
                                <>
                                    <p className={styles.userName}>{user?.fullName || 'Uživatel'}</p>
                                    {user?.username && <p className={styles.userHandle}>@{user.username}</p>}
                                    <p className={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress}</p>
                                    <div className={styles.profileFacts}>
                                        <span>Narození: {dateOfBirth || "neuvedeno"}</span>
                                        <span>Telefon: {personalPhone || "neuvedeno"}</span>
                                        <span>Adresa: {address || "neuvedena"}</span>
                                        <span>Benefit: {benefit || "bez benefitu"}</span>
                                        <span>Režim: {contactProfileType === "rover" ? "Rover" : "Vedoucí / Hl. vedoucí"}</span>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.editForm}>
                                    <div className={styles.sectionTabs}>
                                        <button type="button" className={`${styles.sectionTab} ${activeSection === "personal" ? styles.sectionTabActive : ""}`} onClick={() => setActiveSection("personal")}>
                                            Osobní
                                        </button>
                                        <button type="button" className={`${styles.sectionTab} ${activeSection === "contact" ? styles.sectionTabActive : ""}`} onClick={() => setActiveSection("contact")}>
                                            Kontakt
                                        </button>
                                        <button type="button" className={`${styles.sectionTab} ${activeSection === "parents" ? styles.sectionTabActive : ""}`} onClick={() => setActiveSection("parents")}>
                                            Rodiče
                                        </button>
                                    </div>

                                    <div className={styles.roleModeSwitch}>
                                        <button type="button" className={`${styles.roleModeButton} ${contactProfileType === "leader" ? styles.roleModeButtonActive : ""}`} onClick={() => setContactProfileType("leader")}>
                                            Vedoucí / Hl. vedoucí
                                        </button>
                                        <button type="button" className={`${styles.roleModeButton} ${contactProfileType === "rover" ? styles.roleModeButtonActive : ""}`} onClick={() => setContactProfileType("rover")}>
                                            Rover
                                        </button>
                                    </div>

                                    {activeSection === "personal" && (
                                        <div className={styles.sectionPanel}>
                                            <div>
                                                <label className={styles.formLabel}>Uživatelské jméno</label>
                                                <input
                                                    className={styles.input}
                                                    value={username}
                                                    onChange={(e) => {
                                                        setUsername(e.target.value);
                                                        if (user && e.target.value !== user.username) {
                                                            setNeedsPasswordForUsername(true);
                                                        } else {
                                                            setNeedsPasswordForUsername(false);
                                                            setPassword("");
                                                        }
                                                    }}
                                                    placeholder="username"
                                                />
                                            </div>
                                            <div className={styles.twoColumn}>
                                                <div>
                                                    <label className={styles.formLabel}>Jméno</label>
                                                    <input className={styles.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jan" />
                                                </div>
                                                <div>
                                                    <label className={styles.formLabel}>Příjmení</label>
                                                    <input className={styles.input} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Novák" />
                                                </div>
                                            </div>
                                            <div className={styles.twoColumn}>
                                                <div>
                                                    <label className={styles.formLabel}>Datum narození</label>
                                                    <input className={styles.input} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                                                </div>
                                                <div>
                                                    <label className={styles.formLabel}>Osobní telefon</label>
                                                    <input className={styles.input} value={personalPhone} onChange={(e) => setPersonalPhone(e.target.value)} placeholder="+420..." />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>Osobní e-mail</label>
                                                <input className={styles.input} value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} placeholder="vas@email.cz" />
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>Adresa</label>
                                                <input className={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ulice, město" />
                                            </div>
                                            <div>
                                                <label className={styles.formLabel}>Benefit pro dopravu</label>
                                                <select className={styles.input} value={benefit} onChange={(e) => setBenefit(e.target.value)}>
                                                    <option value="">Bez benefitu</option>
                                                    {BENEFIT_OPTIONS.map((option) => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "contact" && (
                                        <div className={styles.sectionPanel}>
                                            {contactProfileType === "leader" ? (
                                                <>
                                                    <div className={styles.twoColumn}>
                                                        <div>
                                                            <label className={styles.formLabel}>Jméno kontaktu</label>
                                                            <input className={styles.input} value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className={styles.formLabel}>Telefon kontaktu</label>
                                                            <input className={styles.input} value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={styles.formLabel}>E-mail kontaktu</label>
                                                        <input className={styles.input} value={emergencyContactEmail} onChange={(e) => setEmergencyContactEmail(e.target.value)} />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className={styles.sectionHint}>
                                                    Rover vyplňuje kontakty na rodiče v sekci Rodiče. Tady nic dalšího není potřeba.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeSection === "parents" && (
                                        <div className={styles.sectionPanel}>
                                            {contactProfileType === "rover" ? (
                                                <>
                                                    <div className={styles.twoColumn}>
                                                        <div>
                                                            <label className={styles.formLabel}>Rodič 1</label>
                                                            <input className={styles.input} value={parent1Name} onChange={(e) => setParent1Name(e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className={styles.formLabel}>Telefon rodiče 1</label>
                                                            <input className={styles.input} value={parent1Phone} onChange={(e) => setParent1Phone(e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={styles.formLabel}>E-mail rodiče 1</label>
                                                        <input className={styles.input} value={parent1Email} onChange={(e) => setParent1Email(e.target.value)} />
                                                    </div>
                                                    <div className={styles.twoColumn}>
                                                        <div>
                                                            <label className={styles.formLabel}>Rodič 2</label>
                                                            <input className={styles.input} value={parent2Name} onChange={(e) => setParent2Name(e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className={styles.formLabel}>Telefon rodiče 2</label>
                                                            <input className={styles.input} value={parent2Phone} onChange={(e) => setParent2Phone(e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={styles.formLabel}>E-mail rodiče 2</label>
                                                        <input className={styles.input} value={parent2Email} onChange={(e) => setParent2Email(e.target.value)} />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className={styles.sectionHint}>
                                                    Vedoucí a hl. vedoucí vyplňují jen jeden kontakt v sekci Kontakt.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {needsPasswordForUsername && (
                                        <div style={{ backgroundColor: '#fef2f2', border: '3px solid #dc2626', borderRadius: '8px', padding: '1rem' }}>
                                            <label className={styles.formLabel} style={{ color: '#991b1b' }}>
                                                Pro změnu uživatelského jména zadejte heslo
                                            </label>
                                            <input className={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Vaše heslo" style={{ borderColor: '#dc2626', marginTop: '0.5rem' }} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.actionButtons}>
                        {!isEditing ? (
                            <button className={styles.actionButton} onClick={() => setIsEditing(true)}>
                                Upravit Profil
                            </button>
                        ) : (
                            <div className={styles.twoColumn}>
                                <button className={`${styles.actionButton} ${styles.primaryButton}`} onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? "Ukládám..." : "Uložit"}
                                </button>
                                <button className={styles.actionButton} onClick={handleCancel}>
                                    Zrušit
                                </button>
                            </div>
                        )}

                        <button className={`${styles.actionButton} ${styles.dangerButton}`} onClick={() => signOut({ redirectUrl: '/sign-in' })}>
                            Odhlásit se
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
