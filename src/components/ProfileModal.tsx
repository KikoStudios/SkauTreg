"use client";
import React, { useState, useRef } from 'react';
import { useUser, useClerk } from "@clerk/nextjs";
import { useProfileModal } from "../context/ProfileModalContext";
import styles from './ProfileModal.module.css';

export default function ProfileModal() {
    const { isOpen, closeProfile } = useProfileModal();
    const { user } = useUser();
    const { signOut } = useClerk();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
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

    const resizeImage = (file: File, maxSize: number = 800): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
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
                        0.85 // 85% quality
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
            // Resize and compress image
            const resizedBlob = await resizeImage(file);
            const resizedFile = new File([resizedBlob], file.name, { type: 'image/jpeg' });
            
            await user.setProfileImage({ file: resizedFile });
        } catch (err: any) {
            console.error("Failed to upload image", err);
            alert("Chyba při nahrávání obrázku: " + (err.errors?.[0]?.message || err.message));
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
                                        border: '2px solid #000',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        boxShadow: '2px 2px 0 0 #000'
                                    }}
                                    title="Změnit profilový obrázek"
                                >
                                    {isUploadingImage ? '...' : <img src="/icons/upload-icon.svg" alt="upload" style={{ width: '16px', height: '16px', filter: 'brightness(0)' }} />}
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
