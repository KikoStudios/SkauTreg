"use client";

import { useState, useRef, useEffect } from "react";

interface SelectOption {
    value: string;
    label: string;
}

interface LargeSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
}

export default function LargeSelect({ value, onChange, options }: LargeSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: "100%",
                    padding: "1rem 1.5rem",
                    paddingRight: "3rem",
                    border: "3px solid #000",
                    borderRadius: "12px",
                    fontSize: "1.125rem",
                    fontFamily: "inherit",
                    fontWeight: "700",
                    boxShadow: "4px 4px 0 0 #000",
                    transition: "all 0.1s",
                    cursor: "pointer",
                    textAlign: "left",
                    backgroundColor: "white",
                    position: "relative"
                }}
                onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translate(2px, 2px)";
                    e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                }}
                onMouseUp={(e) => {
                    e.currentTarget.style.transform = "translate(0, 0)";
                    e.currentTarget.style.boxShadow = "4px 4px 0 0 #000";
                }}
            >
                {selectedOption?.label || "Vyberte..."}
                
                {/* Arrow */}
                <span style={{
                    position: "absolute",
                    right: "1.5rem",
                    top: "50%",
                    transform: `translateY(-50%) ${isOpen ? "rotate(180deg)" : "rotate(0deg)"}`,
                    transition: "transform 0.2s",
                    fontSize: "1.25rem",
                    pointerEvents: "none"
                }}>
                    ▼
                </span>
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 0.75rem)",
                        left: 0,
                        right: 0,
                        backgroundColor: "white",
                        border: "2px solid var(--border-color)",
                        borderRadius: "8px",
                        boxShadow: "4px 4px 0 0 #000",
                        zIndex: 1000,
                        maxHeight: "400px",
                        overflowY: "auto"
                    }}
                >
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: "1rem 1.25rem",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "1rem",
                                backgroundColor: value === option.value ? "#86efac" : "white",
                                borderBottom: "2px solid var(--border-color)",
                                transition: "background-color 0.1s"
                            }}
                            onMouseEnter={(e) => {
                                if (value !== option.value) {
                                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (value !== option.value) {
                                    e.currentTarget.style.backgroundColor = "white";
                                }
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
