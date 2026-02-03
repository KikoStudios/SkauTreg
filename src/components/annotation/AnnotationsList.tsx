"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import styles from "./Annotator.module.css";

interface AnnotationsListProps {
    fileId: Id<"meeting_files">;
    selectedAnnotationId?: Id<"meeting_annotations"> | null;
    onSelectAnnotation?: (annotationId: Id<"meeting_annotations"> | null) => void;
}

export default function AnnotationsList({
    fileId,
    selectedAnnotationId,
    onSelectAnnotation
}: AnnotationsListProps) {
    const annotations = useQuery(api.meetingFiles.getAnnotations, { fileId });

    if (!annotations) return <div className={styles.emptyState}>Loading annotations...</div>;

    if (annotations.length === 0) {
        return (
            <div className={styles.emptyState}>
                No annotations yet.<br />
                Click on the image to add one!
            </div>
        );
    }

    // Sort by creation time for consistent numbering
    const sortedAnnotations = [...annotations].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Separate point and draw annotations for proper numbering
    const pointAnnotations = sortedAnnotations.filter(a => a.type === "point");
    const drawAnnotations = sortedAnnotations.filter(a => a.type === "draw");

    return (
        <div className={styles.annotationsList}>
            {sortedAnnotations.map((annotation) => {
                const isPoint = annotation.type === "point";
                const pointIndex = isPoint
                    ? pointAnnotations.findIndex(a => a._id === annotation._id) + 1
                    : -1;
                const isSelected = selectedAnnotationId === annotation._id;

                return (
                    <div
                        key={annotation._id}
                        className={`${styles.annotationItem} ${isSelected ? styles.selected : ""}`}
                        onClick={() => onSelectAnnotation?.(isSelected ? null : annotation._id)}
                        style={{
                            cursor: "pointer",
                            background: isSelected ? "#fef3c7" : "white",
                            borderColor: isSelected ? "#fcd34d" : "#e5e7eb",
                        }}
                    >
                        <span className={`${styles.annotationBadge} ${styles[annotation.type]}`}>
                            {isPoint ? `#${pointIndex}` : "✏️"}
                        </span>
                        <div className={styles.annotationHeader}>
                            <span className={styles.annotationAuthor}>
                                {annotation.authorName || "Anonymous"}
                            </span>
                            <span className={styles.annotationTime}>
                                {new Date(annotation.createdAt).toLocaleTimeString("cs-CZ", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                        {annotation.content && (
                            <div className={styles.annotationContent}>
                                {annotation.content}
                            </div>
                        )}
                        {annotation.type === "draw" && (
                            <div className={styles.annotationMeta}>
                                <small style={{ color: "#666", fontSize: "0.75rem" }}>
                                    Drawing annotation
                                </small>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
