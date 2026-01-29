"use client";

import { useState, useRef, useEffect } from "react";

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    style?: React.CSSProperties;
    placeholder?: string;
}

export default function Select({ value, onChange, options, style, placeholder }: SelectProps) {
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
        <div ref={containerRef} style={{ position: "relative", width: "100%", ...style }}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: "100%",
                    padding: "0.75rem",
                    paddingRight: "2.5rem",
                    border: "2px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                    fontFamily: "inherit",
                    fontWeight: "500",
                    boxShadow: "2px 2px 0 0 #000",
                    transition: "all 0.1s",
                    cursor: "pointer",
                    textAlign: "left",
                    backgroundColor: "white",
                    position: "relative"
                }}
                onFocus={(e) => {
                    e.currentTarget.style.transform = "translate(1px, 1px)";
                    e.currentTarget.style.boxShadow = "1px 1px 0 0 #000";
                }}
                onBlur={(e) => {
                    e.currentTarget.style.transform = "translate(0, 0)";
                    e.currentTarget.style.boxShadow = "2px 2px 0 0 #000";
                }}
            >
                {selectedOption?.label || placeholder || "Vyberte..."}
                
                {/* Arrow */}
                <svg 
                    style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: `translateY(-50%) ${isOpen ? "rotate(180deg)" : "rotate(0deg)"}`,
                        transition: "transform 0.2s",
                        width: "1.25rem",
                        height: "1.25rem",
                        pointerEvents: "none"
                    }}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 0.5rem)",
                        left: 0,
                        right: 0,
                        backgroundColor: "white",
                        border: "2px solid var(--border-color)",
                        borderRadius: "6px",
                        boxShadow: "4px 4px 0 0 #000",
                        zIndex: 1000,
                        maxHeight: "300px",
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
                                padding: "0.75rem 1rem",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "0.95rem",
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
