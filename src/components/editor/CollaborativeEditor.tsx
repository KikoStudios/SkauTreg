"use client";

import { useTiptapSync } from "@convex-dev/prosemirror-sync/tiptap";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { mergeAttributes } from "@tiptap/core";
import { createMentionSuggestion, MentionItem } from "./MentionSuggestion";
import CollaborativeCursors from "./CollaborativeCursors";
import styles from "./Editor.module.css";
import { useRef, useEffect } from "react";

interface CollaborativeEditorProps {
    pageId: Id<"meeting_pages">;
    troopId?: Id<"troops">;
    editable?: boolean;
}

export default function CollaborativeEditor({
    pageId,
    troopId,
    editable = true,
}: CollaborativeEditorProps) {
    const convex = useConvex();
    const updateCursor = useMutation(api.editorPresence.updateCursor);
    const removeCursor = useMutation(api.editorPresence.removeCursor);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Search mentions function
    const searchMentions = async (query: string): Promise<MentionItem[]> => {
        if (!troopId) return [];

        try {
            const results = await convex.query(api.mentions.search, {
                query,
                troopId
            });
            return results;
        } catch (error) {
            console.error("Failed to search mentions:", error);
            return [];
        }
    };

    // Use the Tiptap sync hook from Convex component
    const sync = useTiptapSync(api.prosemirrorSync, pageId);

    const CustomMention = Mention.extend({
        addAttributes() {
            return {
                ...(this.parent ? this.parent() : {}),
                type: {
                    default: null,
                    parseHTML: element => element.getAttribute('data-type'),
                    renderHTML: attributes => {
                        if (!attributes.type) return {};
                        return { 'data-type': attributes.type };
                    },
                },
            };
        },
        renderHTML({ node, HTMLAttributes }) {
            const type = node.attrs.type;
            let href = "#";

            if (type === "trip") href = `/trips/${node.attrs.id}`;
            else if (type === "user") {
                href = "/members";
            } else if (type === "base" || type === "station") {
                href = "/tools";
            }

            return [
                'a',
                mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                    href,
                    class: 'mention',
                    'data-id': node.attrs.id,
                    'data-type': type,
                }),
                this.options.renderLabel ? this.options.renderLabel({ options: this.options, node }) : `@${node.attrs.label ?? node.attrs.id}`,
            ];
        },
    });

    // Create editor with sync extension
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false, // Disable local history when using collaboration
            }),
            Placeholder.configure({
                placeholder: "Start typing your notes...",
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "editor-link",
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    style: "max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #000; margin: 1rem 0;",
                },
            }),
            CustomMention.configure({
                HTMLAttributes: {
                    class: "mention",
                },
                suggestion: createMentionSuggestion(searchMentions),
            }),
            ...(sync.extension ? [sync.extension] : []),
        ],
        content: sync.initialContent ?? "",
        editable,
        editorProps: {
            attributes: {
                class: "prose prose-invert max-w-none",
            },
        },
        onSelectionUpdate: ({ editor }) => {
            // Update cursor position when selection changes
            if (editable) {
                const { from } = editor.state.selection;
                updateCursor({
                    pageId,
                    position: from,
                    selection: {
                        from: editor.state.selection.from,
                        to: editor.state.selection.to,
                    },
                }).catch((err) => console.error("Failed to update cursor:", err));
            }
        },
    }, [sync.initialContent, sync.extension, pageId, editable]);

    // Cleanup cursor on unmount
    useEffect(() => {
        return () => {
            removeCursor({ pageId }).catch(() => {
                // Ignore errors on cleanup
            });
        };
    }, [pageId]);

    // Loading state
    if (sync.isLoading) {
        return (
            <div style={{
                padding: "2rem",
                textAlign: "center",
                color: "#9ca3af",
                fontStyle: "italic",
            }}>
                Loading editor...
            </div>
        );
    }

    // No document exists - show create button
    if (sync.initialContent === null) {
        return (
            <div style={{
                padding: "2rem",
                textAlign: "center",
            }}>
                <button
                    onClick={() => sync.create({
                        type: "doc",
                        content: [{
                            type: "paragraph",
                            content: [],
                        }],
                    })}
                    style={{
                        padding: "0.75rem 1.5rem",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        cursor: "pointer",
                        fontWeight: "600",
                    }}
                >
                    Create Notebook
                </button>
            </div>
        );
    }

    if (!editor) {
        return (
            <div style={{
                padding: "2rem",
                textAlign: "center",
                color: "#9ca3af",
                fontStyle: "italic",
            }}>
                Initializing editor...
            </div>
        );
    }

    return (
        <div className={styles.editor} ref={editorContainerRef}>
            {/* Formatting Toolbar */}
            {editable && (
                <div className={styles.toolbar}>
                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("bold") ? styles.isActive : ""}`}
                            title="Bold"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("italic") ? styles.isActive : ""}`}
                            title="Italic"
                        >
                            <em>I</em>
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("strike") ? styles.isActive : ""}`}
                            title="Strikethrough"
                        >
                            <s>S</s>
                        </button>
                    </div>

                    <div className={styles.toolbarDivider} />

                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={`${styles.toolbarButton} ${editor.isActive("heading", { level: 1 }) ? styles.isActive : ""}`}
                            title="Heading 1"
                        >
                            H1
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={`${styles.toolbarButton} ${editor.isActive("heading", { level: 2 }) ? styles.isActive : ""}`}
                            title="Heading 2"
                        >
                            H2
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            className={`${styles.toolbarButton} ${editor.isActive("heading", { level: 3 }) ? styles.isActive : ""}`}
                            title="Heading 3"
                        >
                            H3
                        </button>
                    </div>

                    <div className={styles.toolbarDivider} />

                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("bulletList") ? styles.isActive : ""}`}
                            title="Bullet List"
                        >
                            •
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("orderedList") ? styles.isActive : ""}`}
                            title="Numbered List"
                        >
                            1.
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("blockquote") ? styles.isActive : ""}`}
                            title="Quote"
                        >
                            "
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("code") ? styles.isActive : ""}`}
                            title="Code"
                        >
                            {"</>"}
                        </button>
                    </div>

                    <div className={styles.toolbarDivider} />

                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={() => {
                                const url = window.prompt("Enter URL:");
                                if (url) {
                                    editor.chain().focus().setLink({ href: url }).run();
                                }
                            }}
                            className={`${styles.toolbarButton} ${editor.isActive("link") ? styles.isActive : ""}`}
                            title="Add Link"
                        >
                            🔗
                        </button>
                    </div>
                </div>
            )}
            <div className={styles.editorWrapper} ref={wrapperRef}>
                <EditorContent editor={editor} />
                {/* Show other users' cursors */}
                <CollaborativeCursors 
                    pageId={pageId} 
                    editor={editor}
                    containerRef={wrapperRef}
                />
            </div>
        </div>
    );
}
