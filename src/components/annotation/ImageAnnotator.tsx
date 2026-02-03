"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import styles from "./Annotator.module.css";
import DrawingCanvas from "./DrawingCanvas";
import AnnotationsList from "./AnnotationsList";

interface ImageAnnotatorProps {
    fileId: Id<"meeting_files">;
    imageUrl: string;
    onClose: () => void;
}

type Tool = "draw" | "point" | "comment";

export default function ImageAnnotator({ fileId, imageUrl, onClose }: ImageAnnotatorProps) {
    const [tool, setTool] = useState<Tool>("draw");
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
    const [commentText, setCommentText] = useState("");
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<Id<"meeting_annotations"> | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);

    const addAnnotation = useMutation(api.meetingFiles.addAnnotation);
    const annotations = useQuery(api.meetingFiles.getAnnotations, { fileId });

    useEffect(() => {
        if (imageRef.current) {
            setImageSize({
                width: imageRef.current.naturalWidth,
                height: imageRef.current.naturalHeight,
            });
        }
    }, [imageUrl]);

    useEffect(() => {
        if (showCommentInput && commentInputRef.current) {
            commentInputRef.current.focus();
        }
    }, [showCommentInput]);

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (tool !== "point" && tool !== "comment") return;

        const img = imageRef.current;
        if (!img) return;

        const rect = img.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setCommentPosition({ x, y });
        setShowCommentInput(true);
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim()) {
            setShowCommentInput(false);
            setCommentText("");
            return;
        }

        await addAnnotation({
            fileId,
            type: "point",
            x: tool === "point" ? commentPosition.x : undefined,
            y: tool === "point" ? commentPosition.y : undefined,
            content: commentText,
        });

        setShowCommentInput(false);
        setCommentText("");
    };

    const handleDrawingComplete = async (svgPath: string) => {
        await addAnnotation({
            fileId,
            type: "draw",
            drawingData: svgPath,
            color: "#4caf50",
        });
    };

    // Sort annotations by creation time for consistent numbering
    const pointAnnotations = annotations
        ?.filter(a => a.type === "point" && a.x !== undefined && a.y !== undefined)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        || [];

    // Get draw annotations
    const drawAnnotations = annotations?.filter(a => a.type === "draw") || [];

    return (
        <div className={styles.annotatorOverlay} onClick={onClose}>
            <div className={styles.annotatorContainer} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.headerTitle}>Image Annotation</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Image Panel */}
                    <div className={styles.imagePanel}>
                        {/* Toolbar */}
                        <div className={styles.toolbar}>
                            <button
                                className={`${styles.toolButton} ${tool === "draw" ? styles.active : ""}`}
                                onClick={() => setTool("draw")}
                                title="Draw freehand on the image"
                            >
                                ✏️ Draw
                            </button>
                            <button
                                className={`${styles.toolButton} ${tool === "point" ? styles.active : ""}`}
                                onClick={() => setTool("point")}
                                title="Click on the image to add a positioned comment"
                            >
                                📍 Point & Comment
                            </button>
                            <button
                                className={`${styles.toolButton} ${tool === "comment" ? styles.active : ""}`}
                                onClick={() => {
                                    setTool("comment");
                                    setShowCommentInput(true);
                                    setCommentPosition({ x: 50, y: 20 });
                                }}
                                title="Add a general comment (not tied to a specific location)"
                            >
                                💬 Comment
                            </button>
                        </div>

                        {/* Image Container */}
                        <div className={styles.imageContainer}>
                            <div className={styles.imageWrapper}>
                                <img
                                    ref={imageRef}
                                    src={imageUrl}
                                    alt="Annotation"
                                    className={styles.image}
                                    onClick={handleImageClick}
                                    style={{
                                        cursor: tool === "draw" ? "crosshair" : tool === "point" ? "crosshair" : "default",
                                        pointerEvents: tool === "draw" ? "none" : "auto",
                                        userSelect: "none",
                                        WebkitUserSelect: "none",
                                    }}
                                    draggable={false}
                                />

                                {/* Display saved drawings - only selected or all if none selected */}
                                {drawAnnotations
                                    .filter(a => selectedAnnotationId === null || a._id === selectedAnnotationId)
                                    .map(annotation => (
                                        <svg
                                            key={annotation._id}
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                width: "100%",
                                                height: "100%",
                                                pointerEvents: "none",
                                                zIndex: 1,
                                            }}
                                            viewBox={`0 0 ${imageRef.current?.clientWidth || 800} ${imageRef.current?.clientHeight || 600}`}
                                            preserveAspectRatio="none"
                                        >
                                            <path
                                                d={annotation.drawingData || ""}
                                                stroke={annotation.color || "#4caf50"}
                                                strokeWidth="3"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    ))
                                }

                                {/* Point Markers - with consistent numbering */}
                                {pointAnnotations.map((annotation, index) => (
                                    <div
                                        key={annotation._id}
                                        className={styles.marker}
                                        style={{
                                            left: `${annotation.x}%`,
                                            top: `${annotation.y}%`,
                                            pointerEvents: "auto",
                                            opacity: selectedAnnotationId === null || selectedAnnotationId === annotation._id ? 1 : 0.3,
                                            cursor: "pointer",
                                            zIndex: 2,
                                        }}
                                        title={annotation.content}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAnnotationId(
                                                selectedAnnotationId === annotation._id ? null : annotation._id
                                            );
                                        }}
                                    >
                                        {index + 1}
                                    </div>
                                ))}

                                {/* Drawing Canvas - overlay on top for draw mode */}
                                {tool === "draw" && imageSize.width > 0 && (
                                    <div style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: "100%",
                                        pointerEvents: "auto",
                                        zIndex: 3,
                                    }}>
                                        <DrawingCanvas
                                            imageWidth={imageRef.current?.clientWidth || 0}
                                            imageHeight={imageRef.current?.clientHeight || 0}
                                            onDrawingComplete={handleDrawingComplete}
                                        />
                                    </div>
                                )}

                                {/* Comment Input */}
                                {showCommentInput && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: `${commentPosition.x}%`,
                                            top: `${commentPosition.y}%`,
                                            transform: tool === "comment" ? "translate(-50%, 0)" : "translate(-50%, -100%)",
                                            marginTop: tool === "comment" ? "0" : "-45px",
                                            zIndex: 10,
                                        }}
                                    >
                                        <div style={{
                                            background: "white",
                                            border: "3px solid #000",
                                            borderRadius: "8px",
                                            padding: "0.75rem",
                                            boxShadow: "4px 4px 0 0 #000",
                                            minWidth: "300px",
                                        }}>
                                            <input
                                                ref={commentInputRef}
                                                type="text"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleCommentSubmit();
                                                    if (e.key === "Escape") {
                                                        setShowCommentInput(false);
                                                        setCommentText("");
                                                    }
                                                }}
                                                placeholder={tool === "comment" ? "Add general comment..." : "Add comment at this point..."}
                                                style={{
                                                    width: "100%",
                                                    border: "2px solid #000",
                                                    borderRadius: "6px",
                                                    padding: "0.5rem",
                                                    fontWeight: "600",
                                                    fontSize: "0.875rem",
                                                }}
                                            />
                                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                                <button
                                                    onClick={handleCommentSubmit}
                                                    style={{
                                                        flex: 1,
                                                        padding: "0.375rem",
                                                        border: "2px solid #000",
                                                        borderRadius: "6px",
                                                        background: "#86efac",
                                                        fontWeight: "700",
                                                        cursor: "pointer",
                                                        fontSize: "0.75rem",
                                                    }}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowCommentInput(false);
                                                        setCommentText("");
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: "0.375rem",
                                                        border: "2px solid #000",
                                                        borderRadius: "6px",
                                                        background: "white",
                                                        fontWeight: "700",
                                                        cursor: "pointer",
                                                        fontSize: "0.75rem",
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <h3 className={styles.sidebarTitle}>Annotations</h3>
                        </div>
                        <AnnotationsList
                            fileId={fileId}
                            selectedAnnotationId={selectedAnnotationId}
                            onSelectAnnotation={setSelectedAnnotationId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
