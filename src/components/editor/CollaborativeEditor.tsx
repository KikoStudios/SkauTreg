"use client";

import { useTiptapSync } from "@convex-dev/prosemirror-sync/tiptap";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { mergeAttributes } from "@tiptap/core";
import { createMentionSuggestion, MentionItem } from "./MentionSuggestion";
import CollaborativeCursors from "./CollaborativeCursors";
import PromptModal from "../PromptModal";
import ColorPicker from "../ColorPicker";
import styles from "./Editor.module.css";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    const router = useRouter();
    const convex = useConvex();
    const updateCursor = useMutation(api.editorPresence.updateCursor);
    const removeCursor = useMutation(api.editorPresence.removeCursor);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const colorButtonRef = useRef<HTMLButtonElement>(null);
    const highlightButtonRef = useRef<HTMLButtonElement>(null);
    
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);

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
                href = `/tools?baseId=${node.attrs.id}`;
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
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Link.configure({
                openOnClick: false, // Disable default click handling
                HTMLAttributes: {
                    class: 'editor-link',
                },
            }),
            Placeholder.configure({
                placeholder: "Start typing your notes...",
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
            handleClickOn: (view, pos, node, nodePos, event, direct) => {
                // Allow clicks on links and mentions to pass through
                const target = event.target as HTMLElement;
                if (target.tagName === 'A' || target.closest('a')) {
                    return false; // Let the click event propagate
                }
                return false;
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

    // Handle link clicks to prevent default navigation
    useEffect(() => {
        if (!editor) return;
        
        const handleLinkClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Check if the clicked element is a link or has a link parent
            const linkElement = target.tagName === 'A' ? target as HTMLAnchorElement : target.closest('a');
            
            if (linkElement) {
                const href = linkElement.getAttribute('href');
                if (!href) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                // Check if it's an internal link (starts with / or is relative)
                const isInternal = href.startsWith('/') || (!href.startsWith('http://') && !href.startsWith('https://'));
                
                if (isInternal) {
                    // Navigate internally using Next.js router
                    router.push(href);
                } else {
                    // Open external links in new tab
                    window.open(href, '_blank', 'noopener,noreferrer');
                }
            }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener('click', handleLinkClick);
        return () => editorElement.removeEventListener('click', handleLinkClick);
    }, [editor, router]);

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
            {/* Main Editor Content */}
            <div className={styles.editorContent}>
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
            
            {/* Formatting Toolbar - Right Side */}
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
                        <button
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("underline") ? styles.isActive : ""}`}
                            title="Underline"
                        >
                            <u>U</u>
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
                            &quot;
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
                            ref={colorButtonRef}
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className={`${styles.toolbarButton}`}
                            title="Text Color"
                        >
                            A
                        </button>
                        <button
                            ref={highlightButtonRef}
                            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                            className={`${styles.toolbarButton} ${editor.isActive("highlight") ? styles.isActive : ""}`}
                            title="Highlight"
                        >
                            ⬛
                        </button>
                        <button
                            onClick={() => {
                                editor.chain().focus().unsetAllMarks().run();
                            }}
                            className={`${styles.toolbarButton}`}
                            title="Clear Formatting"
                        >
                            ✕
                        </button>
                    </div>

                    <div className={styles.toolbarDivider} />

                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={() => {
                                if (editor.isActive("link")) {
                                    editor.chain().focus().unsetLink().run();
                                } else {
                                    setShowLinkModal(true);
                                }
                            }}
                            className={`${styles.toolbarButton} ${editor.isActive("link") ? styles.isActive : ""}`}
                            title={editor.isActive("link") ? "Remove Link" : "Add Link"}
                        >
                            {editor.isActive("link") ? "🔗✕" : "🔗"}
                        </button>
                    </div>
                </div>
            )}
            
            {/* Custom Modals */}
            {showLinkModal && (
                <PromptModal
                    title="Přidat odkaz"
                    placeholder="example.com nebo https://example.com"
                    defaultValue=""
                    onConfirm={(url) => {
                        let formattedUrl = url.trim();
                        // Auto-add https:// if no protocol specified
                        if (formattedUrl && !formattedUrl.match(/^[a-zA-Z]+:\/\//)) {
                            formattedUrl = 'https://' + formattedUrl;
                        }
                        editor.chain().focus().setLink({ href: formattedUrl }).run();
                        setShowLinkModal(false);
                    }}
                    onCancel={() => setShowLinkModal(false)}
                />
            )}
            
            {/* Color Pickers */}
            {showColorPicker && (
                <ColorPicker
                    onSelect={(color) => {
                        editor.chain().focus().setColor(color).run();
                    }}
                    onClose={() => setShowColorPicker(false)}
                    buttonRef={colorButtonRef as React.RefObject<HTMLButtonElement>}
                />
            )}
            
            {showHighlightPicker && (
                <ColorPicker
                    onSelect={(color) => {
                        editor.chain().focus().toggleHighlight({ color }).run();
                    }}
                    onClose={() => setShowHighlightPicker(false)}
                    buttonRef={highlightButtonRef as React.RefObject<HTMLButtonElement>}
                />
            )}
        </div>
    );
}
