"use client";

import React, { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import styles from "./AuthForm.module.css";
import Button from "../Button";

export default function SignInForm() {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

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
            } else {
                console.log(result);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Something went wrong. Please try again.");
        }
    };

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

            <div className={styles.footer}>
                Don't have an account?{" "}
                <Link href="/sign-up" className={styles.link}>
                    Sign up
                </Link>
            </div>
        </div>
    );
}
