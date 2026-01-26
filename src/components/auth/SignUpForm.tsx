"use client";

import React, { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import styles from "./AuthForm.module.css";
import Button from "../Button";

export default function SignUpForm() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    // Handle sign-up submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setError("");

        try {
            await signUp.create({
                username,
                emailAddress: email,
                password,
                firstName,
                lastName,
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
                router.push("/");
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
                    <Image
                        src="/logo_skautreg.svg"
                        alt="Logo"
                        width={180}
                        height={40}
                        priority
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
                <Image
                    src="/logo_skautreg.svg"
                    alt="Logo"
                    width={180}
                    height={40}
                    priority
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
                        Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={styles.input}
                        placeholder="janedoe123"
                        required
                    />
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
