"use client";

import React, { useEffect, useState } from "react";
import { useAuth, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./AuthForm.module.css";
import Button from "../Button";

const USERNAME_REGEX = /^[A-Za-z0-9_-]+$/;

export default function SignUpForm() {
    const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
    const { isLoaded, signUp, setActive } = useSignUp();
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [benefit, setBenefit] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (isAuthLoaded && isSignedIn) {
            router.replace("/home");
        }
    }, [isAuthLoaded, isSignedIn, router]);

    if (isAuthLoaded && isSignedIn) {
        return null;
    }

    // Handle sign-up submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setError("");

        const normalizedUsername = username.trim();
        if (!USERNAME_REGEX.test(normalizedUsername)) {
            setError("Username can only contain letters, numbers, - or _.");
            return;
        }

        try {
            await signUp.create({
                username: normalizedUsername,
                emailAddress: email,
                password,
                firstName,
                lastName,
                unsafeMetadata: {
                    dateOfBirth: dateOfBirth,
                    benefit: benefit,
                },
            });

            // Prepare for email verification
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setVerifying(true);
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Something went wrong.");
        }
    };

    // Handle verification code submission
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setError("");

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status === "complete") {
                await setActive({ session: completeSignUp.createdSessionId });
                router.push("/home");
            } else {
                console.error(JSON.stringify(completeSignUp, null, 2));
            }
        } catch (err: any) {
            console.error("Error:", JSON.stringify(err, null, 2));
            setError(err.errors?.[0]?.message || "Verification failed.");
        }
    };

    if (verifying) {
        return (
            <div className={styles.container}>
                <div className="flex justify-center mb-6" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <img
                        src="/logo_skautreg.svg"
                        alt="Logo"
                        style={{ width: '180px', height: '40px' }}
                    />
                </div>
                <p className={styles.footer} style={{ marginTop: '0', marginBottom: '1.5rem', textAlign: 'left' }}>
                    We sent a verification code to <strong>{email}</strong>. Enter it below to confirm your account.
                </p>

                <form onSubmit={handleVerify} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Verification Code
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className={styles.input}
                            placeholder="123456"
                            required
                        />
                    </div>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <Button type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Verify Email
                    </Button>

                    <button
                        type="button"
                        onClick={async () => {
                            if (!isLoaded || !signUp) return;
                            try {
                                await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
                                alert("Nový kód byl odeslán na váš e-mail!");
                            } catch (err: any) {
                                console.error(err);
                                alert("Chyba při odesílání: " + (err.errors?.[0]?.message || "Neznámá chyba"));
                            }
                        }}
                        style={{
                            marginTop: "1rem",
                            background: "none",
                            border: "none",
                            color: "#666",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            width: "100%",
                            textAlign: "center"
                        }}
                    >
                        Nepřišel kód? Poslat znovu
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className="flex justify-center mb-6" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <img
                    src="/logo_skautreg.svg"
                    alt="Logo"
                    style={{ width: '180px', height: '40px' }}
                />
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            First Name
                        </label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={styles.input}
                            placeholder="Jane"
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Last Name
                        </label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={styles.input}
                            placeholder="Doe"
                            required
                        />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Date of Birth
                    </label>
                    <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className={styles.input}
                        max={new Date().toISOString().split('T')[0]}
                    />
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        Optional - helps personalize your experience
                    </span>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Benefit for transport
                    </label>
                    <select
                        value={benefit}
                        onChange={(e) => setBenefit(e.target.value)}
                        className={styles.input}
                    >
                        <option value="">No benefit</option>
                        <option value="žákovský průkaz ČR">žákovský průkaz ČR</option>
                        <option value="karta ISIC">karta ISIC</option>
                        <option value="karta ITIC">karta ITIC</option>
                        <option value="karta ALIVE">karta ALIVE</option>
                        <option value="karta EYCA (EURO<26)">karta EYCA (EURO&lt;26)</option>
                        <option value="potvrzení o studiu">potvrzení o studiu</option>
                        <option value="průkaz ZTP">průkaz ZTP</option>
                        <option value="průkaz ZTP/P">průkaz ZTP/P</option>
                        <option value="průvodce ZTP/P">průvodce ZTP/P</option>
                        <option value="průkaz ŤZP">průkaz ŤZP</option>
                        <option value="průkaz ŤZP/S">průkaz ŤZP/S</option>
                        <option value="průvodce ŤZP/S">průvodce ŤZP/S</option>
                        <option value="JUNIOR (ZSSK)">JUNIOR (ZSSK)</option>
                        <option value="průkaz rodiče pro ústavy">průkaz rodiče pro ústavy</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={styles.input}
                        placeholder="janedoe123"
                        pattern="[A-Za-z0-9_-]+"
                        title="Use letters, numbers, hyphens or underscores only."
                        required
                    />
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        Allowed characters: letters, numbers, - and _
                    </span>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Email address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        placeholder="you@example.com"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        placeholder="••••••••"
                        required
                    />
                </div>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <Button type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center' }}>
                    Sign Up
                </Button>
            </form>

            <div className={styles.footer}>
                Already have an account?{" "}
                <Link href="/sign-in" className={styles.link}>
                    Sign in
                </Link>
            </div>
        </div>
    );
}
