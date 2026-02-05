"use client";

export const dynamic = 'force-dynamic';

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import Button from "../../../../components/Button";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import GmailSettings from "../../../../components/GmailSettings";

// --- Helpers for Image Upload (Copied/Adapted) ---
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas is empty'));
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

const SpinningLogo = ({ src, alt = "Logo" }: { src?: string; alt?: string }) => (
    <div style={{
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        border: "3px solid #000",
        backgroundColor: "#ccc",
        boxShadow: "4px 4px 0 0 #000",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        margin: "0 auto"
    }}>
        {src ? (
            <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "spin 10s linear infinite" }} />
        ) : (
            <span style={{ fontSize: "1rem", fontWeight: "bold" }}>LOGO</span>
        )}
        <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
);

const PASTEL_COLORS = [
    "#fca5a5", // red-300
    "#fdba74", // orange-300
    "#fcd34d", // amber-300
    "#bef264", // lime-300
    "#86efac", // green-300
    "#67e8f9", // cyan-300
    "#93c5fd", // blue-300
    "#c4b5fd", // violet-300
    "#f0abfc", // fuchsia-300
    "#fda4af", // rose-300
];

export default function TroopSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const troopId = params.troopId as Id<"troops">;

    const troop = useQuery(api.troops.getById, { id: troopId });
    const updateTroop = useMutation(api.troops.update);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const deleteTroop = useMutation(api.troops.deleteTroop);

    const [activeTab, setActiveTab] = useState<"general" | "branding" | "gmail" | "danger">("general");
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        number: "",
        type: "",
        description: "",
        contactEmail: "",
        infoEmail: "",
        accentColor: ""
    });

    // Image Upload State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Initialize Data
    useEffect(() => {
        if (troop) {
            setFormData({
                name: troop.name || "",
                number: troop.number || "",
                type: troop.type || "",
                description: troop.description || "",
                contactEmail: troop.contactEmail || "",
                infoEmail: troop.infoEmail || "",
                accentColor: troop.accentColor || ""
            });
        }
    }, [troop]);

    // Handlers
    const onCropComplete = useCallback((activeTab: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => setImageSrc(reader.result as string));
            reader.readAsDataURL(file);
        }
    };

    const confirmCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            const objectUrl = URL.createObjectURL(blob);
            setPreviewUrl(objectUrl);
            setImageSrc(null); // Close cropper
        } catch (e) {
            console.error(e);
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let logoStorageId = undefined;

            if (previewUrl) {
                // We have a new image blob in blob form if we wanted, but here we need to re-fetch blob from objectUrl or just keep it in state. 
                // Let's re-fetch for simplicity or better, store blob in state. Refactor slightly:
                const response = await fetch(previewUrl);
                const blob = await response.blob();

                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": blob.type },
                    body: blob,
                });
                const { storageId } = await result.json();
                logoStorageId = storageId;
            }

            await updateTroop({
                id: troopId,
                name: formData.name,
                number: formData.number,
                type: formData.type,
                description: formData.description,
                contactEmail: formData.contactEmail,
                infoEmail: formData.infoEmail,
                accentColor: formData.accentColor,
                logo: logoStorageId // Only update if new one uploaded
            });
            alert("Uloženo!");
        } catch (error) {
            console.error(error);
            alert("Chyba při ukládání.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmText = prompt(`Pro potvrzení smazání napište "${troop?.name}"`);
        if (confirmText === troop?.name) {
            try {
                await deleteTroop({ id: troopId });
                router.push("/");
            } catch (error) {
                console.error(error);
                alert("Chyba při mazání.");
            }
        } else {
            alert("Názvy se neshodují.");
        }
    };

    if (!troop) return <div>Načítám...</div>;

    return (
        <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto", paddingBottom: "6rem", overflowX: "visible" }}>
            <div style={{
                background: "linear-gradient(140deg, #fef3c7 0%, #e0e7ff 100%)",
                border: "3px solid #000",
                borderRadius: "16px",
                padding: "1.5rem 2rem",
                marginBottom: "1.5rem",
                boxShadow: "6px 6px 0 0 #000"
            }}>
                <div className="settings-header" style={{ marginBottom: "0.5rem" }}>
                    <button onClick={() => router.back()} style={{ background: "white", border: "3px solid #000", borderRadius: "10px", width: "44px", height: "44px", cursor: "pointer", fontSize: "1.3rem", fontWeight: "900", boxShadow: "3px 3px 0 0 #000" }}>←</button>
                    <div>
                        <h1 style={{ fontSize: "2rem", fontWeight: "900", margin: 0, wordBreak: "break-word" }}>Nastavení Oddílu</h1>
                        <div style={{ fontWeight: "700", color: "#374151" }}>Upravte základní informace, vzhled a e‑mailové nastavení.</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <button
                    onClick={() => setActiveTab("general")}
                    style={tabStyle(activeTab === "general")}
                >
                    Základní
                </button>
                <button
                    onClick={() => setActiveTab("branding")}
                    style={tabStyle(activeTab === "branding")}
                >
                    Vzhled & Logo
                </button>
                <button
                    onClick={() => setActiveTab("gmail")}
                    style={tabStyle(activeTab === "gmail")}
                >
                    Gmail & Email
                </button>
                <button
                    onClick={() => setActiveTab("danger")}
                    style={{ ...tabStyle(activeTab === "danger"), color: activeTab === "danger" ? "red" : "inherit" }}
                >
                    Nebezpečná zóna
                </button>
            </div>

            <style jsx>{`
                .settings-header {
                    margin-bottom: 2rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .tabs-container {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding: 0.75rem;
                    background: #fff;
                    border: 3px solid #000;
                    border-radius: 12px;
                    box-shadow: 4px 4px 0 0 #000;
                    flex-wrap: wrap; /* Wrap tabs on small screens */
                }

                @media (max-width: 600px) {
                    .settings-header {
                        flex-direction: row; /* Keep arrow next to title usually */
                    }
                    .settings-header h1 {
                        font-size: 1.5rem !important; /* Force smaller title */
                    }
                    .tabs-container {
                        gap: 0.5rem;
                        justify-content: center; /* Center tabs when wrapped */
                    }
                    /* Make tabs stretch to fill lines */
                    .tabs-container > button {
                        flex: 1 1 auto;
                        text-align: center;
                        white-space: nowrap;
                    }
                }
            `}</style>

            <form onSubmit={handleSave}>
                {/* GENERAL TAB */}
                {activeTab === "general" && (
                    <div style={panelStyle}>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Jméno Oddílu</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                style={inputStyle}
                                required
                            />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Číslo</label>
                                <input
                                    value={formData.number}
                                    onChange={e => setFormData({ ...formData, number: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Typ (např. Vlčata)</label>
                                <input
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Popis</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
                            />
                        </div>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Kontaktní Email</label>
                            <input
                                type="email"
                                value={formData.contactEmail}
                                onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Informační Email (pro rozesílání)</label>
                            <input
                                type="email"
                                value={formData.infoEmail}
                                onChange={e => setFormData({ ...formData, infoEmail: e.target.value })}
                                style={inputStyle}
                                placeholder="info@oddil.cz"
                            />
                            <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: "600", marginTop: "0.35rem" }}>
                                Použije se jako odpovědní adresa při hromadných emailech.
                            </span>
                        </div>
                    </div>
                )}

                {/* BRANDING TAB */}
                {activeTab === "branding" && (
                    <div style={panelStyle}>
                        {/* Logo Section */}
                        <div style={{ textAlign: "center", padding: "2rem", border: "3px dashed #ccc", borderRadius: "12px" }}>
                            <h3 style={{ fontWeight: "900", marginBottom: "1rem" }}>Logo Oddílu</h3>
                            <div style={{ marginBottom: "1.5rem" }}>
                                <SpinningLogo src={previewUrl || troop.logo} />
                            </div>
                            <label style={{
                                display: "inline-block",
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "white",
                                border: "3px solid #000",
                                borderRadius: "8px",
                                fontWeight: "800",
                                cursor: "pointer",
                                boxShadow: "4px 4px 0 0 #000"
                            }}>
                                Nahrát Nové Logo
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                            </label>
                        </div>

                        {/* Color Section */}
                        <div>
                            <h3 style={{ fontWeight: "900", marginBottom: "1rem" }}>Barva Oddílu (pro Kalendář a UI)</h3>
                            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                                {PASTEL_COLORS.map(color => (
                                    <div
                                        key={color}
                                        onClick={() => setFormData({ ...formData, accentColor: color })}
                                        style={{
                                            width: "50px",
                                            height: "50px",
                                            borderRadius: "50%",
                                            backgroundColor: color,
                                            border: formData.accentColor === color ? "4px solid #000" : "2px solid #ccc",
                                            cursor: "pointer",
                                            transform: formData.accentColor === color ? "scale(1.1)" : "scale(1)",
                                            transition: "all 0.1s"
                                        }}
                                    />
                                ))}
                            </div>
                            <input
                                type="text"
                                value={formData.accentColor}
                                onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                                placeholder="#ffffff"
                                style={{ ...inputStyle, marginTop: "1rem", maxWidth: "200px" }}
                            />
                        </div>
                    </div>
                )}

                {/* DANGER TAB */}
                {activeTab === "danger" && (
                    <div style={{
                        border: "3px solid #ef4444",
                        backgroundColor: "#fef2f2",
                        padding: "2rem",
                        borderRadius: "12px",
                        textAlign: "center"
                    }}>
                        <h3 style={{ color: "#ef4444", fontWeight: "900", fontSize: "1.5rem", marginBottom: "1rem" }}>SMAZAT ODDÍL</h3>
                        <p style={{ marginBottom: "2rem", fontWeight: "600" }}>
                            Tato akce je nevratná. Smaže oddíl, všechny členy, výpravy a historii.
                        </p>
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{
                                padding: "1rem 2rem",
                                backgroundColor: "#ef4444",
                                color: "white",
                                border: "3px solid #b91c1c",
                                borderRadius: "8px",
                                fontWeight: "900",
                                cursor: "pointer",
                                boxShadow: "4px 4px 0 0 #b91c1c"
                            }}
                        >
                            SMAZAT ODDÍL "{troop.name}"
                        </button>
                    </div>
                )}

                {/* GMAIL TAB */}
                {activeTab === "gmail" && (
                    <div style={panelStyle}>
                        <GmailSettings 
                            troopId={troopId}
                            isAuthorized={true}
                        />
                    </div>
                )}

                {/* DANGER TAB */}
                {activeTab !== "danger" && (
                    <div style={{
                        position: "fixed",
                        bottom: 0, left: 0, right: 0,
                        padding: "1rem",
                        backgroundColor: "white",
                        borderTop: "3px solid #000",
                        display: "flex",
                        justifyContent: "center",
                        gap: "0.5rem",
                        zIndex: 100,
                        flexWrap: "wrap"
                    }}>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "white",
                                border: "3px solid #000",
                                borderRadius: "8px",
                                fontWeight: "800",
                                cursor: "pointer",
                                flex: "1 1 auto",
                                minWidth: "120px"
                            }}
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "#86efac",
                                border: "3px solid #000",
                                borderRadius: "8px",
                                fontWeight: "900",
                                cursor: "pointer",
                                boxShadow: "4px 4px 0 0 #000",
                                flex: "1 1 auto",
                                minWidth: "120px"
                            }}
                        >
                            {isSaving ? "Ukládám..." : "Uložit Změny"}
                        </button>
                    </div>
                )}
            </form>

            {/* Cropper Modal */}
            {imageSrc && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.9)",
                    zIndex: 3000,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
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
                            Použít Logo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Styles
const tabStyle = (active: boolean) => ({
    padding: "0.65rem 1.25rem",
    fontWeight: "900",
    fontSize: "0.95rem",
    border: "3px solid #000",
    background: active ? "#86efac" : "#f3f4f6",
    cursor: "pointer",
    borderRadius: "999px",
    boxShadow: active ? "3px 3px 0 0 #000" : "2px 2px 0 0 #000",
    opacity: active ? 1 : 0.75,
    textTransform: "uppercase" as const
});

const panelStyle = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.5rem",
    backgroundColor: "white",
    border: "3px solid #000",
    borderRadius: "14px",
    padding: "1.5rem",
    boxShadow: "6px 6px 0 0 #000"
};

const formGroupStyle = {
    display: "flex",
    flexDirection: "column" as const
};

const labelStyle = {
    fontWeight: "800",
    marginBottom: "0.5rem",
    fontSize: "1rem"
};

const inputStyle = {
    padding: "0.75rem",
    border: "3px solid #000",
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
    boxShadow: "4px 4px 0 0 #000",
    fontWeight: "600"
};
