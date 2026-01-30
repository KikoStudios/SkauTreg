"use client";

import React, { useEffect, useState } from "react";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./AuthForm.module.css";
import Button from "../Button";

export default function SignInForm() {
    const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
    const { isLoaded, signIn, setActive } = useSignIn();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (isAuthLoaded && isSignedIn) {
            router.replace("/");
        }
    }, [isAuthLoaded, isSignedIn, router]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (isAuthLoaded && isSignedIn) {
            router.replace("/");
            return;
        }

        if (!isLoaded || !signIn) {
            return;
        }

        try {
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.push("/");
            } else if (result.status === "needs_second_factor") {
                // If 2FA is required but not set up, show helpful error
                setError("Two-factor authentication is required but not configured. Please contact support or use the Clerk sign-in page.");
            } else {
                // Handle other statuses
                setError(`Authentication incomplete. Status: ${result.status}. Please try again or contact support.`);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Something went wrong. Please try again.");
        }
    };

    return (
        <div className={styles.container}>
            <div className="flex justify-center mb-6" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <img
                    src="/logo_skautreg.svg"
                    alt="Logo"
                    style={{ width: '180px', height: '40px' }}
                />
            </div>

            {needsTwoFactor ? (
                <form onSubmit={handleTwoFactorSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Two-Factor Authentication Code
                        </label>
                        <input
                            type="text"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            className={styles.input}
                            placeholder="Enter 6-digit code"
                            required
                            autoComplete="one-time-code"
                            maxLength={6}
                        />
                    </div>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <Button type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center' }}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Email or Username
                    </label>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        placeholder="you@example.com or username"
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
                    Sign In
                </Button>
            </form>