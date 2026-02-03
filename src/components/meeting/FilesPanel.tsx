"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";
import { useState, useRef } from "react";

interface FilesPanelProps {
    meetingId: Id<"meetings">;
    onImageClick: (fileId: Id<"meeting_files">, url: string) => void;
}

export default function FilesPanel({ meetingId, onImageClick }: FilesPanelProps) {
    // Only show files for the current meeting (enforcing strict silo)
    const files = useQuery(api.meetingFiles.list, { meetingId });
    const generateUploadUrl = useMutation(api.meetingFiles.generateUploadUrl);
    const uploadFile = useMutation(api.meetingFiles.upload);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        for (const file of Array.from(selectedFiles)) {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();
            await uploadFile({
                meetingId,
                storageId,
                name: file.name,
                type: file.type,
            });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    };

    const isImage = (contentType?: string, filename?: string) => {
        if (!contentType && !filename) return false;

        if (contentType === "image") {
            if (filename) {
                const ext = filename.toLowerCase().split('.').pop();
                const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
                return imageExts.includes(ext || '');
            }
            return false;
        }

        if (contentType) {
            const lowerType = contentType.toLowerCase();
            return lowerType.startsWith("image/") ||
                lowerType.includes("png") ||
                lowerType.includes("jpg") ||
                lowerType.includes("jpeg") ||
                lowerType.includes("gif") ||
                lowerType.includes("webp") ||
                lowerType.includes("svg");
        }

        return false;
    };

    const isPDF = (contentType?: string) => contentType === "application/pdf";

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>SOUBORY</h3>
            <div className={styles.filesGrid}>
                {files?.map((file) => {
                    const isImg = isImage(file.type, file.name);
                    const fileUrl = file.url || "";

                    return (
                        <div
                            key={file._id}
                            onClick={() => {
                                if (isImg && fileUrl) {
                                    onImageClick(file._id, fileUrl);
                                } else if (fileUrl) {
                                    window.open(fileUrl, "_blank");
                                }
                            }}
                            className={styles.fileCard}
                        >
                            {isImg && fileUrl ? (
                                <img
                                    src={fileUrl}
                                    alt={file.name}
                                    className={styles.fileCardImage}
                                />
                            ) : (
                                <span className={styles.fileCardIcon}>
                                    {isPDF(file.type) ? "📄" : "📎"}
                                </span>
                            )}
                            <div className={styles.fileCardLabel}>
                                {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                            </div>
                        </div>
                    );
                })}

                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`${styles.uploadZone} ${isDragging ? styles.dragging : ''}`}
                >
                    📎 Nahrát soubory
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => handleFileChange(e.target.files)}
                    />
                </div>
            </div>
        </div>
    );
}
