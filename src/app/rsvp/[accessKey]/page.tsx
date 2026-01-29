"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";

// Components & Styles
const Header = () => (
    <div style={{
        textAlign: "center",
        padding: "3rem 0 2rem 0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem"
    }}>
        <img src="/logo_skautreg.svg" alt="SkautReg Logo" style={{ height: "40px" }} />
    </div>
);

const pageContainerStyle = {
    minHeight: "100vh",
    padding: "0 1rem 4rem 1rem",
    maxWidth: "100%",
    boxSizing: "border-box" as const,
};

// Neobrutalist Card Style
const cardStyle = {
    width: "95%",
    maxWidth: "550px",
    margin: "0 auto",
    backgroundColor: "white",
    borderRadius: "8px",
    border: "2px solid #000000", // Thick black border
    boxShadow: "6px 6px 0 0 #000000", // Hard shadow
    overflow: "hidden"
};

const badgeStyle = {
    padding: "0.25rem 0.75rem",
    border: "2px solid #000",
    borderRadius: "6px",
    fontSize: "0.85rem",
    backgroundColor: "#fff",
    boxShadow: "2px 2px 0 0 #000"
};

const primaryButtonStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "1rem",
    borderRadius: "6px",
    border: "2px solid #000",
    backgroundColor: "#86efac", // Brand Primary Green
    color: "#052e16", // Dark green text for contrast
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.1s",
    boxShadow: "4px 4px 0 0 #000", // Hard shadow
};

const secondaryButtonStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "1rem",
    borderRadius: "6px",
    border: "2px solid #000",
    backgroundColor: "white",
    color: "#000",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.1s",
    boxShadow: "4px 4px 0 0 #000", // Hard shadow
};

const linkButtonStyle = {
    background: "none",
    border: "none",
    color: "#000",
    textDecoration: "underline",
    textDecorationThickness: "2px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    marginTop: "1rem"
};

const labelStyle = {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: "700",
    fontSize: "0.95rem",
    color: "#18181b"
};

const inputStyle = {
    width: "100%",
    padding: "0.875rem",
    borderRadius: "6px",
    border: "2px solid #000",
    fontSize: "1rem",
    backgroundColor: "#fff",
    color: "#18181b",
    outline: "none",
    fontWeight: "500",
    boxShadow: "2px 2px 0 0 transparent",
    transition: "box-shadow 0.1s"
};

const infoIconStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "0.5rem",
    fontSize: "0.8rem",
    cursor: "help",
    border: "2px solid #000",
    backgroundColor: "#fff",
    color: "#000",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    fontWeight: "bold"
};

const radioLabelStyle = {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    color: "#18181b",
    padding: "0.5rem 1rem",
    border: "2px solid #000",
    borderRadius: "6px",
    backgroundColor: "#fff",
    boxShadow: "2px 2px 0 0 #000"
};

export default function PublicRSVPPage() {
    const params = useParams();
    const accessKey = params.accessKey as string;

    const data = useQuery(api.public_rsvp.getByAccessKey, { accessKey });
    const submitRSVP = useMutation(api.public_rsvp.submit);

    const [status, setStatus] = useState<string | null>(null);
    const [responses, setResponses] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (data) {
            if (data.currentStatus !== "pending") setStatus(data.currentStatus);
            if (data.currentResponses) setResponses(data.currentResponses);
        }
    }, [data]);

    const googleCalendarUrl = useMemo(() => {
        const safeData = data || {} as any;
        const { tripName, tripDescription, tripLocation, tripStartDate, tripEndDate } = safeData;

        if (!tripStartDate) return "#";

        const parseDate = (str: string) => {
            const [y, m, d] = str.split('-').map(Number);
            return new Date(y, m - 1, d);
        };

        const startDateObj = parseDate(tripStartDate);
        const endDateObj = tripEndDate ? parseDate(tripEndDate) : new Date(startDateObj);

        // Add 1 day to end date for inclusivity
        endDateObj.setDate(endDateObj.getDate() + 1);

        const fmt = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}${m}${day}`;
        };

        const dates = `${fmt(startDateObj)}/${fmt(endDateObj)}`;

        const params = new URLSearchParams({
            action: "TEMPLATE",
            text: tripName || "",
            details: tripDescription || "",
            location: tripLocation || "",
            dates: dates
        });

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }, [data]);

    const handleSubmit = async (chosenStatus: string) => {
        setIsSubmitting(true);
        try {
            await submitRSVP({
                accessKey,
                status: chosenStatus,
                responses: JSON.stringify(responses)
            });
            setStatus(chosenStatus);
            setIsSuccess(true);
        } catch (error) {
            console.error("Failed to submit RSVP", error);
            alert("Něco se pokazilo. Zkuste to prosím znovu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (data === undefined) return <div style={{ padding: "4rem", textAlign: "center", fontFamily: "'Inter', sans-serif" }}>Načítám pozvánku...</div>;
    if (data === null) return <div style={{ padding: "4rem", textAlign: "center", fontFamily: "'Inter', sans-serif" }}>Tento odkaz již není platný nebo neexistuje.</div>;

    const { tripName, tripDescription, tripLocation, tripStartDate, tripEndDate, memberName, customFields: rawCustomFields, formType } = data as any;

    const formatDateCZ = (dateStr: string) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-");
        return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
    };

    const tripDate = `${formatDateCZ(tripStartDate)}${tripEndDate ? " - " + formatDateCZ(tripEndDate) : ""}`;
    const customFields = Array.isArray(rawCustomFields) ? rawCustomFields : [];

    if (isSuccess) {
        return (
            <div style={pageContainerStyle}>
                <Header />
                <div style={cardStyle}>
                    <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
                        <h1 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "1rem", color: "#18181b" }}>Děkujeme!</h1>
                        <p style={{ fontSize: "1.1rem", color: "#18181b", lineHeight: 1.6 }}>
                            Aktualizovali jsme stav pro člena <strong>{memberName}</strong> na:
                        </p>
                        <div style={{ margin: "2rem 0" }}>
                            <span style={{
                                padding: "0.5rem 1rem",
                                borderRadius: "99px",
                                fontWeight: "bold",
                                border: "2px solid #000",
                                backgroundColor: status === "attending" ? "#86efac" : "#fecaca", // Green or Red light
                                color: "#000",
                                boxShadow: "2px 2px 0 0 #000"
                            }}>
                                {status === "attending" ? "JEDE NA VÝPRAVU" : "NEJEDE NA VÝPRAVU"}
                            </span>
                        </div>

                        {status === "attending" && (
                            <a
                                href={googleCalendarUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    ...linkButtonStyle,
                                    textDecoration: "none",
                                    border: "2px solid #000",
                                    padding: "0.75rem 1.5rem",
                                    borderRadius: "8px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginBottom: "1rem"
                                }}
                            >
                                <img src="/icons/kalendar-icon.svg" alt="calendar" style={{ width: "20px", height: "20px", filter: "brightness(0)" }} />
                                Přidat do kalendáře
                            </a>
                        )}
                        <br />

                        <button onClick={() => setIsSuccess(false)} style={linkButtonStyle}>
                            Změnit odpověď
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={pageContainerStyle}>
            <Header />

            <div style={cardStyle}>
                {/* Trip Header */}
                <div style={{ borderBottom: "2px solid #000", padding: "2rem", backgroundColor: "#f4f4f5" }}>
                    <div style={{ textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.75rem", fontWeight: "bold", opacity: 0.7, marginBottom: "0.5rem" }}>
                        Pozvánka na výpravu
                    </div>
                    <h1 style={{ fontSize: "2rem", fontWeight: "900", marginBottom: "0.5rem", lineHeight: 1.1 }}>{tripName}</h1>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.95rem", fontWeight: "600", marginTop: "1rem" }}>
                        <span style={badgeStyle}>
                            <img src="/place-icon.svg" alt="place" style={{ height: "1.25rem", marginRight: "0.25rem", verticalAlign: "bottom" }} /> {tripLocation}
                        </span>
                        <span style={badgeStyle}>
                            <img src="/clock-time-icon.svg" alt="date" style={{ height: "1.25rem", marginRight: "0.25rem", verticalAlign: "bottom" }} /> {tripDate}
                        </span>
                        <a
                            href={googleCalendarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                ...badgeStyle,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                textDecoration: "none",
                                color: "inherit",
                                backgroundColor: "#fff"
                            }}
                            title="Přidat do kalendáře"
                        >
                            <img src="/icons/kalendar-icon.svg" alt="calendar" style={{ width: "20px", height: "20px", filter: "brightness(0)" }} />
                        </a>
                    </div>
                </div>

                <div style={{ padding: "2rem" }}>
                    <p style={{ fontSize: "1.2rem", marginBottom: "2rem", color: "#18181b", lineHeight: 1.6, fontWeight: "500" }}>
                        Ahoj! <br />
                        Prosíme o potvrzení účasti pro člena <span style={{ textDecoration: "underline", textDecorationThickness: "2px", textDecorationColor: "#86efac" }}>{memberName}</span>.
                    </p>

                    {/* Quick Actions */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
                        <div style={{ flex: 1, minWidth: "140px" }}>
                            <button
                                onClick={() => handleSubmit("not_attending")}
                                disabled={isSubmitting}
                                style={secondaryButtonStyle}
                            >
                                <img src="/cross-icon.svg" alt="no" style={{ height: "1.5rem", verticalAlign: "middle", filter: "brightness(0)" }} /> {formType === 'apology' ? "Omluvit se" : "Nepojede"}
                            </button>

                        </div>

                        {formType !== 'apology' && (
                            <div style={{ flex: 1, minWidth: "140px" }}>
                                <button
                                    onClick={() => {
                                        if (customFields.length > 0 && status !== 'attending') {
                                            setStatus("attending");
                                        } else {
                                            handleSubmit("attending");
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    style={primaryButtonStyle}
                                >
                                    <img src="/check-icon.svg" alt="yes" style={{ height: "1.5rem", verticalAlign: "middle", filter: "brightness(0)" }} /> Pojede
                                </button>
                            </div>
                        )}

                        {/* Form Details */}
                        {status === "attending" && formType !== 'apology' && (
                            <div style={{ borderTop: "2px solid #e5e7eb", paddingTop: "2rem", animation: "slideDown 0.3s ease-out" }}>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "1.5rem", color: "#18181b", textTransform: "uppercase" }}>Doplňující údaje</h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                    {customFields.map((field: any, i: number) => (
                                        <div key={i}>
                                            <label style={labelStyle}>
                                                {field.label} {field.required && <img src="/exclamation-icon.svg" alt="required" style={{ marginLeft: "0.25rem", height: "1.2em", verticalAlign: "middle" }} />}
                                                {field.info && (
                                                    <img src="/info-question-icon.svg" alt="info" title={field.info} style={{ marginLeft: "0.5rem", height: "1.5rem", verticalAlign: "middle", cursor: "help" }} />
                                                )}
                                            </label>

                                            {field.type === 'boolean' && (
                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <label style={radioLabelStyle}>
                                                        <input type="radio" name={field.label} value="yes" checked={responses[field.label] === "Ano"} onChange={() => setResponses({ ...responses, [field.label]: "Ano" })} style={{ width: "20px", height: "20px", accentColor: "#000", marginRight: "0.5rem" }} />
                                                        Ano
                                                    </label>
                                                    <label style={radioLabelStyle}>
                                                        <input type="radio" name={field.label} value="no" checked={responses[field.label] === "Ne"} onChange={() => setResponses({ ...responses, [field.label]: "Ne" })} style={{ width: "20px", height: "20px", accentColor: "#000", marginRight: "0.5rem" }} />
                                                        Ne
                                                    </label>
                                                </div>
                                            )}

                                            {field.type === 'checkbox' && (
                                                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: "500" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!responses[field.label]}
                                                        onChange={(e) => setResponses({ ...responses, [field.label]: e.target.checked })}
                                                        style={{ width: "1.2rem", height: "1.2rem", accentColor: "#000", border: "2px solid #000" }}
                                                    />
                                                    {field.label}
                                                </label>
                                            )}

                                            {field.type === 'select' && (
                                                <div style={{ position: "relative" }}>
                                                    <select
                                                        value={responses[field.label] || ""}
                                                        onChange={(e) => setResponses({ ...responses, [field.label]: e.target.value })}
                                                        style={inputStyle}
                                                    >
                                                        <option value="">Vyberte možnost...</option>
                                                        {field.options?.map((opt: string) => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {(field.type === 'text' || !field.type) && (
                                                <input
                                                    type="text"
                                                    required={field.required}
                                                    placeholder={field.placeholder || ""}
                                                    value={responses[field.label] || ""}
                                                    onChange={(e) => setResponses({ ...responses, [field.label]: e.target.value })}
                                                    style={inputStyle}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => handleSubmit("attending")}
                                        disabled={isSubmitting}
                                        style={{ ...primaryButtonStyle, width: "100%", marginTop: "1rem", justifyContent: "center" }}
                                    >
                                        {isSubmitting ? "Ukládání..." : "Potvrdit účast"}
                                    </button>
                                </div>
                            </div>

                        )}
                    </div>
                </div>

                <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                body {
                    background-color: #f4f4f5; 
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    color: #18181b;
                }
            `}</style>
            </div>
        </div>
    );
}


