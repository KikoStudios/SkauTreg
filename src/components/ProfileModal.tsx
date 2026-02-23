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
    const [dateOfBirth, setDateOfBirth] = useState((user?.unsafeMetadata?.dateOfBirth as string) || "");
    const [password, setPassword] = useState("");
    const [needsPasswordForUsername, setNeedsPasswordForUsername] = useState(false);

    React.useEffect(() => {
        if (user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
            setUsername(user.username || "");
            setDateOfBirth((user.unsafeMetadata?.dateOfBirth as string) || "");
        }
    }, [user]);

    const handleCancel = () => {
        setIsEditing(false);
        setPassword("");
        setNeedsPasswordForUsername(false);
        // Reset to original values
        if (user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
            setUsername(user.username || "");
            setDateOfBirth((user.unsafeMetadata?.dateOfBirth as string) || "");
        }
    };

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!user) return;
        
        const usernameChanged = username !== user.username;
        
        // Validate password if username changed
        if (usernameChanged && !password) {
            alert("Pro změnu uživatelského jména musíte zadat heslo");
            return;
        }
        
        try {
            // Update all fields together
            const updateData: any = {
                firstName: firstName,
                lastName: lastName,
                unsafeMetadata: {
                    ...user.unsafeMetadata,
                    dateOfBirth: dateOfBirth,
                },
            };
            
            // Add username and password if changed
            if (usernameChanged) {
                updateData.username = username;
                updateData.password = password;
            }
            
            await user.update(updateData);
            
            setPassword("");
            setNeedsPasswordForUsername(false);
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
                                    {dateOfBirth && (
                                        <p style={{ fontSize: '0.9rem', color: '#52525b', fontWeight: '600', marginTop: '0.5rem' }}>
                                            Narození: {new Date(dateOfBirth).toLocaleDateString('cs-CZ')}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <div className={styles.editForm}>
                                    <div>
                                        <label className={styles.formLabel}>Uživatelské jméno</label>
                                        <input
                                            className={styles.input}
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value);
                                                // Check if username changed
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
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                                    <div>
                                        <label className={styles.formLabel}>Datum narození</label>
                                        <input
                                
                                            className={styles.input}
                                            type="date"
                                            value={dateOfBirth}
                                            onChange={(e) => setDateOfBirth(e.target.value)}
                                            placeholder="1995-01-01"
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    
                                    {needsPasswordForUsername && (
                                        <div style={{ 
                                            backgroundColor: '#fef2f2', 
                                            border: '3px solid #dc2626', 
                                            borderRadius: '8px', 
                                            padding: '1rem',
                                            animation: 'fadeSlideIn 0.3s ease-out'
                                        }}>
                                            <label className={styles.formLabel} style={{ color: '#991b1b' }}>
                                                Pro změnu uživatelského jména zadejte heslo
                                            </label>
                                            <input
                                                className={styles.input}
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Vaše heslo"
                                                style={{ borderColor: '#dc2626', marginTop: '0.5rem' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.actionButtons}>
                        {!isEditing ? (
                            <button 
                                className={styles.actionButton} 
                                onClick={() => setIsEditing(true)}
                                onMouseDown={(e) => {
                                    e.currentTarget.style.transform = "translate(4px, 4px)";
                                    e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = "translate(0, 0)";
                                    e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
                                }}
                            >
                                Upravit Profil
                            </button>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button 
                                    className={`${styles.actionButton} ${styles.primaryButton}`} 
                                    onClick={handleSave}
                                    onMouseDown={(e) => {
                                        e.currentTarget.style.transform = "translate(4px, 4px)";
                                        e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                                    }}
                                    onMouseUp={(e) => {
                                        e.currentTarget.style.transform = "translate(0, 0)";
                                        e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
                                    }}
                                >
                                    Uložit
                                </button>
                                <button 
                                    className={styles.actionButton} 
                                    onClick={handleCancel}
                                    onMouseDown={(e) => {
                                        e.currentTarget.style.transform = "translate(4px, 4px)";
                                        e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                                    }}
                                    onMouseUp={(e) => {
                                        e.currentTarget.style.transform = "translate(0, 0)";
                                        e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
                                    }}
                                >
                                    Zrušit
                                </button>
                            </div>
                        )}

                        <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={() => signOut({ redirectUrl: '/sign-in' })}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = "translate(4px, 4px)";
                                e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                            }}
                            onMouseUp={(e) => {
                                e.currentTarget.style.transform = "translate(0, 0)";
                                e.currentTarget.style.boxShadow = "6px 6px 0 0 #000";
                            }}
                        >
                            Odhlásit se
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
