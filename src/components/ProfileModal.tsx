"use client";
import React, { useState } from 'react';
import { useUser, useClerk } from "@clerk/nextjs";
import { useProfileModal } from "../context/ProfileModalContext";
import styles from './ProfileModal.module.css';

export default function ProfileModal() {
    const { isOpen, closeProfile } = useProfileModal();
    const { user } = useUser();
    const { signOut } = useClerk();
    const [isEditing, setIsEditing] = useState(false);
    const [firstName, setFirstName] = useState(user?.firstName || "");
    const [lastName, setLastName] = useState(user?.lastName || "");
    const [username, setUsername] = useState(user?.username || "");

    React.useEffect(() => {
        if (user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
            setUsername(user.username || "");
        }
    }, [user]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!user) return;
        try {
            await user.update({
                firstName: firstName,
                lastName: lastName,
                username: username,
            });
            setIsEditing(false);
        } catch (err: any) {
            console.error("Failed to update profile", err);
            alert("Chyba při ukládání profilu: " + (err.errors?.[0]?.message || err.message));
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
                        {user?.imageUrl && (
                            <img
                                src={user.imageUrl}
                                alt="Profile"
                                className={styles.userAvatar}
                            />
                        )}
                        <div className={styles.userDetails}>
                            {!isEditing ? (
                                <>
                                    <p className={styles.userName}>{user?.fullName || 'Uživatel'}</p>
                                    {user?.username && <p className={styles.userHandle}>@{user.username}</p>}
                                    <p className={styles.userEmail}>{user?.primaryEmailAddress?.emailAddress}</p>
                                </>
                            ) : (
                                <div className={styles.editForm}>
                                    <div>
                                        <label className={styles.formLabel}>Uživatelské jméno</label>
                                        <input
                                            className={styles.input}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="username"
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.formLabel}>Jméno</label>
                                        <input
                                            className={styles.input}
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Jan"
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.formLabel}>Příjmení</label>
                                        <input
                                            className={styles.input}
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Novák"
                                        />
                                    </div>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button className={`${styles.actionButton} ${styles.primaryButton}`} onClick={handleSave}>
                                    Uložit
                                </button>
                                <button className={styles.actionButton} onClick={() => setIsEditing(false)}>
                                    Zrušit
                                </button>
                            </div>
                        )}

                        <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={() => signOut({ redirectUrl: '/sign-in' })}
                        >
                            Odhlásit se
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
