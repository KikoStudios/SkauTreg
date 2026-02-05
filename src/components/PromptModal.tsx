"use client";

import { useState } from "react";

interface PromptModalProps {
    title: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export default function PromptModal({ 
    title, 
    placeholder = "", 
    defaultValue = "", 
    onConfirm, 
    onCancel 
}: PromptModalProps) {
    const [value, setValue] = useState(defaultValue);

    const handleConfirm = () => {
        if (value.trim()) {
            onConfirm(value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleConfirm();
        } else if (e.key === "Escape") {
            onCancel();
        }
    };

    return (
        <div 
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
            }}
            onClick={onCancel}
        >
            <div 
                style={{
                    backgroundColor: "white",
                    border: "4px solid #000",
                    borderRadius: "16px",
                    padding: "2rem",
                    boxShadow: "8px 8px 0 0 #000",
                    minWidth: "400px",
                    maxWidth: "90%",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ 
                    fontSize: "1.25rem", 
                    fontWeight: "900", 
                    marginBottom: "1.5rem",
                    textTransform: "uppercase"
                }}>
                    {title}
                </h3>
                
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoFocus
                    style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "3px solid #000",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        fontFamily: "inherit",
                        marginBottom: "1.5rem",
                        outline: "none",
                    }}
                />

                <div style={{ 
                    display: "flex", 
                    gap: "1rem", 
                    justifyContent: "flex-end" 
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "white",
                            border: "3px solid #000",
                            borderRadius: "8px",
                            fontWeight: "700",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            boxShadow: "3px 3px 0 0 #000",
                            transition: "all 0.1s",
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = "translate(1px, 1px)"}
                        onMouseUp={(e) => e.currentTarget.style.transform = "translate(0, 0)"}
                    >
                        Zrušit
                    </button>
                    <button
                        onClick={handleConfirm}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "#fcd34d",
                            border: "3px solid #000",
                            borderRadius: "8px",
                            fontWeight: "900",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            boxShadow: "3px 3px 0 0 #000",
                            transition: "all 0.1s",
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = "translate(1px, 1px)"}
                        onMouseUp={(e) => e.currentTarget.style.transform = "translate(0, 0)"}
                    >
                        Potvrdit
                    </button>
                </div>
            </div>
        </div>
    );
}
