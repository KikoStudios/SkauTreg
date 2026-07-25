"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { ImagePlus, Plus, X } from "lucide-react";
import styles from "./TroopPage.module.css";


// Canvas Helper for Cropping
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas is empty'));
            }
        }, 'image/jpeg');
    });
}

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

// Spinning Logo Component
const SpinningLogo = ({ src, alt = "Logo" }: { src?: string; alt?: string }) => (
    <div style={{
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        border: "2px solid #000",
        backgroundColor: "#ccc", // Placeholder gray
        boxShadow: "4px 4px 0 0 #000", // The shadow (static)
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    }}>
        {src ? (
            <img
                src={src}
                alt={alt}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    animation: "spin 10s linear infinite" // The spinning part
                }}
            />
        ) : (
            <div style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#e4e4e7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "0.8rem",
                color: "#71717a",
                animation: "spin 10s linear infinite" // Placeholder text spins too? Maybe cool.
            }}>
                Logo
            </div>
        )}
        <style jsx>{`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
    </div>
);

// Main Page Component
export default function TroopsPage() {
    const searchParams = useSearchParams();
    const troops = useQuery(api.troops.getByUser);
    const createTroop = useMutation(api.troops.create);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
        if (searchParams.get("create") === "true") setShowCreateForm(true);
    }, [searchParams]);

    // Form State
    const [newName, setNewName] = useState("");
    const [newNumber, setNewNumber] = useState("");
    const [newType, setNewType] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Image Upload State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null); // To store ready-to-upload blob
    const [previewUrl, setPreviewUrl] = useState<string | null>(null); // For local preview

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl);
            setCroppedImageBlob(null); // Reset until cropped
            setPreviewUrl(null);
        }
    };

    const confirmCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            setCroppedImageBlob(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            setImageSrc(null); // Close cropper
        } catch (e) {
            console.error(e);
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            let logoStorageId = undefined;

            // 1. Upload Image if exists
            if (croppedImageBlob) {
                // Get URL
                const postUrl = await generateUploadUrl();
                // Post Blob
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": croppedImageBlob.type },
                    body: croppedImageBlob,
                });
                const { storageId } = await result.json();
                logoStorageId = storageId;
            }

            await createTroop({
                name: newName,
                number: newNumber,
                type: newType,
                logo: logoStorageId,
            });
            // Reset and close
            setNewName("");
            setNewNumber("");
            setNewType("");
            setCroppedImageBlob(null);
            setPreviewUrl(null);
            setImageSrc(null);
            setShowCreateForm(false);
        } catch (error: unknown) {
            alert("Error creating troop: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div style={{ position: "relative", minHeight: "80vh", paddingBottom: "2rem" }} onClick={() => setShowCreateForm(false)}>
            {/* Standard Header */}
            <div className="headingContainer" style={{ height: "64px", minHeight: "64px", padding: "0 2rem", display: "flex", flexDirection: "row", alignItems: "center", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "1rem" }}>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: "900", margin: 0, lineHeight: 1 }}>Oddíly</h1>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowCreateForm(!showCreateForm);
                        }}
                        style={{
                            width: "48px",
                            height: "48px",
                            flexShrink: 0,
                            borderRadius: "50%",
                            backgroundColor: "white",
                            border: "2px solid #000",
                            boxShadow: "4px 4px 0 0 #000",
                            fontSize: "2rem",
                            fontWeight: "300",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: "0 0 6px 0",
                            transition: "transform 0.1s"
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
                        onMouseUp={e => e.currentTarget.style.transform = "translate(0, 0)"}
                    >
                        <Plus size={25} strokeWidth={2.5} />
                    </button>
                    
                    {showCreateForm && (
                        <div className={styles.createOverlay} onClick={() => setShowCreateForm(false)}>
                          <div className={styles.createDialog} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-troop-title">
                            <div className={styles.dialogHeader}>
                              <div><span>Nový projekt</span><h2 id="new-troop-title">Vytvořit oddíl</h2><p>Základní údaje můžete kdykoliv doplnit v nastavení.</p></div>
                              <button onClick={() => setShowCreateForm(false)} aria-label="Zavřít"><X size={22} /></button>
                            </div>
                            <form onSubmit={handleCreate} className={styles.createForm}>
                                <div className={styles.logoRow}>
                                    <div className={styles.logoPreview}>
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Náhled loga" />
                                        ) : (
                                            <ImagePlus size={25} />
                                        )}
                                    </div>
                                    <div><strong>Logo oddílu</strong><small>Čtvercový obrázek, ideálně alespoň 400 × 400 px.</small>
                                        <label className={styles.uploadButton}>Vybrat obrázek
                                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                                        </label>
                                    </div>
                                </div>
                                <div className={styles.formField}>
                                    <label>Jméno oddílu</label>
                                    <input
                                        required
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="Chodci"
                                    />
                                </div>
                                <div className={styles.formGrid}>
                                    <div className={styles.formField}>
                                        <label>Číslo oddílu</label>
                                        <input
                                            value={newNumber}
                                            onChange={e => setNewNumber(e.target.value)}
                                            placeholder="106"
                                        />
                                    </div>
                                    <div className={styles.formField}>
                                        <label>Typ</label>
                                        <input
                                            value={newType}
                                            onChange={e => setNewType(e.target.value)}
                                            placeholder="Skauti"
                                        />
                                    </div>
                                </div>
                                <div className={styles.dialogActions}><button type="button" onClick={() => setShowCreateForm(false)}>Zrušit</button><button type="submit" disabled={isCreating}>{isCreating ? "Vytvářím…" : "Vytvořit oddíl"}</button></div>
                            </form>
                          </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboardContent">

            {/* Troops Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "2rem"
            }}>
                {troops === undefined ? (
                    <div>Načítám oddíly...</div>
                ) : troops.length === 0 ? (
                    <div style={{ opacity: 0.6, fontStyle: "italic", padding: "1rem" }}>
                        Zatím nemáte žádné oddíly. Klikněte na + vpravo nahoře.
                    </div>
                ) : (
                    troops.map((troop) => (
                        <Link href={`/troop/${troop._id}`} key={troop._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="troop-card" style={{
                                border: "2px solid #000",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                backgroundColor: "white",
                                boxShadow: "6px 6px 0 0 #000",
                                position: "relative",
                                minHeight: "180px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                transition: "transform 0.1s, box-shadow 0.1s",
                                cursor: "pointer"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        {troop.number && (
                                            <div style={{ fontWeight: "800", fontSize: "1.2rem", marginBottom: "0.25rem" }}>
                                                {troop.number}. Oddíl
                                            </div>
                                        )}
                                        <h2 style={{
                                            fontSize: "2.5rem",
                                            fontWeight: "900",
                                            lineHeight: "1",
                                            marginBottom: "0.5rem",
                                            wordBreak: "break-word"
                                        }}>
                                            {troop.name}
                                        </h2>
                                        {troop.type && (
                                            <div style={{
                                                textTransform: "uppercase",
                                                fontWeight: "800",
                                                letterSpacing: "2px",
                                                fontSize: "1rem"
                                            }}>
                                                {troop.type}
                                            </div>
                                        )}
                                    </div>
                                    <SpinningLogo src={troop.logo} />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Cropper Modal Overlay */}
            {imageSrc && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.85)",
                    zIndex: 3000,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                }} onClick={e => e.stopPropagation()}>
                    <div style={{ position: "relative", width: "90%", height: "60%", backgroundColor: "#333", borderRadius: "8px", overflow: "hidden" }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
                        <button
                            onClick={() => setImageSrc(null)}
                            style={{ padding: "0.5rem 1rem", backgroundColor: "white", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                        >
                            Zrušit
                        </button>
                        <button
                            onClick={confirmCrop}
                            style={{ padding: "0.5rem 1rem", backgroundColor: "#86efac", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                        >
                            Ořezat & Použít
                        </button>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

function readFile(file: File): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.addEventListener('load', () => resolve(reader.result as string), false)
        reader.readAsDataURL(file)
    })
}
