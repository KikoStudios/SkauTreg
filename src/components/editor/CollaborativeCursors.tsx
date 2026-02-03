// src/components/editor/CollaborativeCursors.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useState, RefObject } from "react";
import { Editor } from "@tiptap/react";
import styles from "./EditorCursor.module.css";

interface CursorPos {
    top: number;
    left: number;
    height: number;
    selectionRects: Array<{ top: number; left: number; width: number; height: number }>;
}

interface CollaborativeCursorsProps {
    pageId: Id<"meeting_pages">;
    editor: Editor | null;
    containerRef: RefObject<HTMLDivElement | null>;
}

// Generate a consistent color for each user
const getUserColor = (userId: string): string => {
    const colors = [
        "#3b82f6", // blue
        "#10b981", // green
        "#f59e0b", // amber
        "#ef4444", // red
        "#8b5cf6", // purple
        "#ec4899", // pink
        "#06b6d4", // cyan
        "#f97316", // orange
    ];
    
    const hash = userId.split("").reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
};

export default function CollaborativeCursors({ pageId, editor, containerRef }: CollaborativeCursorsProps) {
    const cursors = useQuery(api.editorPresence.getActiveCursors, { pageId });
    const [cursorPositions, setCursorPositions] = useState<Map<string, CursorPos>>(new Map());

    useEffect(() => {
        if (!editor || !cursors || cursors.length === 0 || !containerRef.current) return;

        const container = containerRef.current;
        const view = editor.view;

        const updatePositions = () => {
            const positions = new Map<string, CursorPos>();
            const containerRect = container.getBoundingClientRect();

            cursors.forEach((cursor) => {
                if (cursor.position === undefined) return;

                try {
                    const pos = Math.min(Math.max(0, cursor.position), editor.state.doc.content.size);
                    const coords = view.coordsAtPos(pos);
                    
                    const selectionRects: Array<{ top: number; left: number; width: number; height: number }> = [];
                    if (cursor.selection && cursor.selection.from !== cursor.selection.to) {
                        const from = Math.min(Math.max(0, cursor.selection.from), editor.state.doc.content.size);
                        const to = Math.min(Math.max(0, cursor.selection.to), editor.state.doc.content.size);
                        
                        const start = view.domAtPos(from);
                        const end = view.domAtPos(to);
                        
                        const range = document.createRange();
                        range.setStart(start.node, start.offset);
                        range.setEnd(end.node, end.offset);
                        
                        const rects = range.getClientRects();
                        for (let i = 0; i < rects.length; i++) {
                            const r = rects[i];
                            if (r.width > 0) {
                                selectionRects.push({
                                    top: r.top - containerRect.top,
                                    left: r.left - containerRect.left,
                                    width: r.width,
                                    height: r.height,
                                });
                            }
                        }
                    }

                    positions.set(cursor._id, {
                        top: coords.top - containerRect.top,
                        left: coords.left - containerRect.left,
                        height: coords.bottom - coords.top || 20,
                        selectionRects,
                    });
                } catch (error) {
                    console.error("Error calculating cursor position:", error);
                }
            });

            setCursorPositions(positions);
        };

        updatePositions();
        
        const observer = new MutationObserver(updatePositions);
        observer.observe(view.dom, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
        });

        window.addEventListener('resize', updatePositions);
        window.addEventListener('scroll', updatePositions, true);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updatePositions);
            window.removeEventListener('scroll', updatePositions, true);
        };
    }, [cursors, editor, containerRef]);

    if (!cursors || cursors.length === 0) return null;

    return (
        <div className={styles.cursorOverlay}>
            {cursors.map((cursor) => {
                const pos = cursorPositions.get(cursor._id);
                if (!pos) return null;

                const color = getUserColor(cursor.userId);

                return (
                    <div key={cursor._id}>
                        {pos.selectionRects.map((rect, i) => (
                            <div
                                key={`${cursor._id}-sel-${i}`}
                                className={styles.selectionRect}
                                style={{
                                    top: `${rect.top}px`,
                                    left: `${rect.left}px`,
                                    width: `${rect.width}px`,
                                    height: `${rect.height}px`,
                                    backgroundColor: color,
                                }}
                            />
                        ))}
                        
                        <div
                            className={styles.cursor}
                            style={{
                                top: `${pos.top}px`,
                                left: `${pos.left}px`,
                                height: `${pos.height}px`,
                            }}
                        >
                            <div
                                className={styles.cursorLine}
                                style={{ backgroundColor: color }}
                            />
                            <div
                                className={styles.cursorLabel}
                                style={{ backgroundColor: color }}
                            >
                                {cursor.userName}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
