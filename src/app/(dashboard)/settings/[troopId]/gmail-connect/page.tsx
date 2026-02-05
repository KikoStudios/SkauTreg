"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function GmailConnectPage() {
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const troopId = typeof params?.troopId === "string" ? params.troopId : "";

    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
        const redirectUri = process.env.NEXT_PUBLIC_GMAIL_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            setError("Chyba konfigurace: chybí Gmail credentials");
            return;
        }

        const state = Buffer.from(JSON.stringify({ troopId })).toString("base64");
        const paramsObj = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
            access_type: "offline",
            prompt: "consent",
            state,
        });

        window.location.href = `https://accounts.google.com/o/oauth2/auth?${paramsObj.toString()}`;
    }, [troopId]);

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-xl font-semibold mb-2">Přesměrování na Google</h1>
            <p className="text-sm text-gray-600">
                Přesměrováváme vás na přihlášení do Google účtu…
            </p>
            {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    <p className="font-semibold">Chyba:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}
        </div>
    );
}
