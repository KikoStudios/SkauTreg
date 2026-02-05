"use client";

import { useRef, useEffect } from "react";

interface ColorPickerProps {
    onSelect: (color: string) => void;
    onClose: () => void;
    buttonRef: React.RefObject<HTMLButtonElement>;
}

const presetColors = [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
    "#ffff00", "#ff00ff", "#00ffff", "#ffa500", "#800080",
    "#ffc0cb", "#a52a2a", "#808080", "#ffd700", "#4b0082"
];

export default function ColorPicker({ onSelect, onClose, buttonRef }: ColorPickerProps) {
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                pickerRef.current && 
                !pickerRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose, buttonRef]);

    const getPosition = () => {
        if (!buttonRef.current) return { top: 0, left: 0 };
        
        const rect = buttonRef.current.getBoundingClientRect();
        return {
            top: rect.bottom + 8,
            left: rect.left,
        };
    };

    const position = getPosition();

    return (
        <div
            ref={pickerRef}
            style={{
                position: "fixed",
                top: `${position.top}px`,
                left: `${position.left}px`,
                backgroundColor: "white",
                border: "3px solid #000",
                borderRadius: "12px",
                padding: "0.75rem",
                boxShadow: "6px 6px 0 0 #000",
                zIndex: 10000,
                minWidth: "200px",
            }}
        >
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "0.5rem",
                marginBottom: "0.75rem",
            }}>
                {presetColors.map((color) => (
                    <button
                        key={color}
                        onClick={() => {
                            onSelect(color);
                            onClose();
                        }}
                        style={{
                            width: "32px",
                            height: "32px",
                            backgroundColor: color,
                            border: "2px solid #000",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "transform 0.1s",
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
                        onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                        title={color}
                    />
                ))}
            </div>
            
            <div style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                paddingTop: "0.75rem",
                borderTop: "2px solid #e5e7eb",
            }}>
                <input
                    type="color"
                    onChange={(e) => {
                        onSelect(e.target.value);
                    }}
                    style={{
                        width: "40px",
                        height: "32px",
                        border: "2px solid #000",
                        borderRadius: "6px",
                        cursor: "pointer",
                    }}
                />
                <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#666" }}>
                    Vlastní barva
                </span>
            </div>
        </div>
    );
}
