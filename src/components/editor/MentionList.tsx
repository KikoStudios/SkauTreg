import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { MentionItem } from "./MentionSuggestion";

interface MentionListProps {
    items: MentionItem[];
    command: (item: MentionItem) => void;
}

const MentionList = forwardRef((props: MentionListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === "ArrowUp") {
                upHandler();
                return true;
            }

            if (event.key === "ArrowDown") {
                downHandler();
                return true;
            }

            if (event.key === "Enter") {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    return (
        <div
            style={{
                background: "white",
                border: "3px solid #000",
                borderRadius: "12px",
                boxShadow: "6px 6px 0 0 #000",
                padding: "0.5rem",
                overflow: "hidden",
                maxHeight: "320px",
                overflowY: "auto",
            }}
        >
            {props.items.length > 0 ? (
                props.items.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => selectItem(index)}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.625rem 0.75rem",
                            border: "none",
                            background: index === selectedIndex ? "#fcd34d" : "transparent",
                            cursor: "pointer",
                            borderRadius: "8px",
                            transition: "all 0.1s",
                            textAlign: "left",
                            fontWeight: index === selectedIndex ? "700" : "600",
                        }}
                    >
                        {item.image ? (
                            <img
                                src={item.image}
                                alt={item.label}
                                style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    border: "2px solid #000",
                                    objectFit: "cover",
                                }}
                            />
                        ) : item.icon ? (
                            <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                        ) : (
                            <span style={{ fontSize: "1.25rem" }}>📌</span>
                        )}
                        <div style={{ flex: 1, overflow: "hidden" }}>
                            <div
                                style={{
                                    fontSize: "0.875rem",
                                    color: "#000",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {item.label}
                            </div>
                            {item.sublabel && (
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "#666",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {item.sublabel}
                                </div>
                            )}
                        </div>
                        <span
                            style={{
                                fontSize: "0.625rem",
                                padding: "0.125rem 0.375rem",
                                background: "#f3f4f6",
                                borderRadius: "4px",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                color: "#6b7280",
                            }}
                        >
                            {item.type}
                        </span>
                    </button>
                ))
            ) : (
                <div
                    style={{
                        padding: "1rem",
                        textAlign: "center",
                        color: "#9ca3af",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                    }}
                >
                    No results found
                </div>
            )}
        </div>
    );
});

MentionList.displayName = "MentionList";

export default MentionList;
