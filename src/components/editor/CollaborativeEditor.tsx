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
import { Extension, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { createMentionSuggestion, MentionItem } from "./MentionSuggestion";
import CollaborativeCursors from "./CollaborativeCursors";
import PromptModal from "../PromptModal";
import ColorPicker from "../ColorPicker";
import styles from "./Editor.module.css";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, RemoveFormatting, Unlink2 } from "lucide-react";

const anchoredNodeTypes = ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock"];

const BlockAnchor = Extension.create({
    name: "blockAnchor",
    addGlobalAttributes() {
        return [{
            types: anchoredNodeTypes,
            attributes: {
                blockId: {
                    default: null,
                    parseHTML: (element) => element.getAttribute("data-block-id"),
                    renderHTML: (attributes) => attributes.blockId ? { "data-block-id": attributes.blockId, id: `b_${attributes.blockId}` } : {},
                },
                gameId: {
                    default: null,
                    parseHTML: (element) => element.getAttribute("data-game-id"),
                    renderHTML: (attributes) => attributes.gameId ? { "data-game-id": attributes.gameId } : {},
                },
            },
        }];
    },
});

const AgendaTimeDecorations = Extension.create({
    name: "agendaTimeDecorations",
    addProseMirrorPlugins() {
        return [new Plugin({
            key: new PluginKey("agenda-time-decorations"),
            props: {
                decorations(state) {
                    const decorations: Decoration[] = [];
                    const pattern = /\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:-|–|—)\s*(?:[01]?\d|2[0-3]):[0-5]\d\b/g;
                    state.doc.descendants((node, position) => {
                        if (!node.isText || !node.text) return;
                        for (const match of node.text.matchAll(pattern)) {
                            const start = position + (match.index ?? 0);
                            decorations.push(Decoration.inline(start, start + match[0].length, {
                                class: "agenda-time-token",
                                title: "Rozpoznaný časový blok",
                            }));
                        }
                    });
                    return DecorationSet.create(state.doc, decorations);
                },
            },
        })];
    },
});

function ensureBlockAnchors(editor: NonNullable<ReturnType<typeof useEditor>>) {
    const transaction = editor.state.tr;
    editor.state.doc.forEach((node, offset) => {
        if (anchoredNodeTypes.includes(node.type.name) && !node.attrs.blockId) {
            transaction.setNodeMarkup(offset, undefined, { ...node.attrs, blockId: crypto.randomUUID() });
        }
    });
    if (transaction.docChanged) editor.view.dispatch(transaction);
}

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
    const [hasSelection, setHasSelection] = useState(false);

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
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                history: false, // Disable local history when using collaboration
            }),
            BlockAnchor,
            AgendaTimeDecorations,
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
                placeholder: "Začněte psát. Pomocí @ vložíte odkaz na člověka nebo výpravu.",
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
            handleClickOn: (view, pos, node, nodePos, event) => {
                // Allow clicks on links and mentions to pass through
                const target = event.target as HTMLElement;
                if (target.tagName === 'A' || target.closest('a')) {
                    return false; // Let the click event propagate
                }
                return false;
            },
        },
        onSelectionUpdate: ({ editor }) => {
            setHasSelection(!editor.state.selection.empty);
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
        onCreate: ({ editor }) => ensureBlockAnchors(editor),
        onUpdate: ({ editor }) => ensureBlockAnchors(editor),
    }, [sync.initialContent, sync.extension, pageId, editable]);

    // Cleanup cursor on unmount
    useEffect(() => {
        return () => {
            removeCursor({ pageId }).catch(() => {
                // Ignore errors on cleanup
            });
        };
    }, [pageId, removeCursor]);

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

    useEffect(() => {
        if (!editor) return;
        const insertGame = (event: Event) => {
            const detail = (event as CustomEvent<{
                pageId: Id<"meeting_pages">;
                game: { id: string; name: string; description: string; instructions: string; durationMinutes: number; equipment: string[] };
            }>).detail;
            if (!detail || detail.pageId !== pageId) return;
            const equipment = detail.game.equipment.length
                ? `Vybavení: ${detail.game.equipment.join(", ")}`
                : "Bez zvláštního vybavení";
            editor.chain().focus().insertContent([
                { type: "heading", attrs: { level: 2, gameId: detail.game.id }, content: [{ type: "text", text: detail.game.name }] },
                { type: "paragraph", content: [{ type: "text", text: `${detail.game.durationMinutes} min · ${detail.game.description}` }] },
                { type: "paragraph", content: [{ type: "text", text: equipment }] },
                { type: "paragraph", content: [{ type: "text", text: detail.game.instructions }] },
            ]).run();
        };
        window.document.addEventListener("documents:insert-game", insertGame);
        return () => window.document.removeEventListener("documents:insert-game", insertGame);
    }, [editor, pageId]);

    // Loading state
    if (sync.isLoading) {
        return <div className={styles.editorState}><span /> Načítám obsah…</div>;
    }

    // No document exists - show create button
    if (sync.initialContent === null) {
        return (
            <div className={styles.editorStart}>
                <button type="button"
                    onClick={() => sync.create({
                        type: "doc",
                        content: [{
                            type: "paragraph",
                            content: [],
                        }],
                    })}
                >
                    Začít psát
                </button>
            </div>
        );
    }

    if (!editor) {
        return <div className={styles.editorState}><span /> Připravuji editor…</div>;
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
            {editable && hasSelection && (
                <div className={styles.toolbar}>
                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("bold") ? styles.isActive : ""}`}
                            title="Tučně"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("italic") ? styles.isActive : ""}`}
                            title="Kurzíva"
                        >
                            <em>I</em>
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("strike") ? styles.isActive : ""}`}
                            title="Přeškrtnout"
                        >
                            <s>S</s>
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("underline") ? styles.isActive : ""}`}
                            title="Podtrhnout"
                        >
                            <u>U</u>
                        </button>
                    </div>

                    <div className={styles.toolbarDivider} />

                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={`${styles.toolbarButton} ${editor.isActive("heading", { level: 1 }) ? styles.isActive : ""}`}
                            title="Nadpis 1"
                        >
                            H1
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={`${styles.toolbarButton} ${editor.isActive("heading", { level: 2 }) ? styles.isActive : ""}`}
                            title="Nadpis 2"
                        >
                            H2
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            className={`${styles.toolbarButton} ${editor.isActive("heading", { level: 3 }) ? styles.isActive : ""}`}
                            title="Nadpis 3"
                        >
                            H3
                        </button>
                    </div>

                    <div className={styles.toolbarDivider} />

                    <div className={styles.toolbarGroup}>
                        <button
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("bulletList") ? styles.isActive : ""}`}
                            title="Odrážkový seznam"
                        >
                            •
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("orderedList") ? styles.isActive : ""}`}
                            title="Číslovaný seznam"
                        >
                            1.
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("blockquote") ? styles.isActive : ""}`}
                            title="Citace"
                        >
                            &quot;
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            className={`${styles.toolbarButton} ${editor.isActive("code") ? styles.isActive : ""}`}
                            title="Kód"
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
                            title="Barva textu"
                        >
                            A
                        </button>
                        <button
                            ref={highlightButtonRef}
                            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                            className={`${styles.toolbarButton} ${editor.isActive("highlight") ? styles.isActive : ""}`}
                            title="Zvýraznit"
                        >
                            H
                        </button>
                        <button
                            onClick={() => {
                                editor.chain().focus().unsetAllMarks().run();
                            }}
                            className={`${styles.toolbarButton}`}
                            title="Vyčistit formátování"
                        >
                            <RemoveFormatting size={14} />
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
                            title={editor.isActive("link") ? "Odebrat odkaz" : "Přidat odkaz"}
                        >
                            {editor.isActive("link") ? <Unlink2 size={14} /> : <Link2 size={14} />}
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
