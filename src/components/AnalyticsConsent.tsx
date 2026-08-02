"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const CONSENT_KEY = "skautreg.analytics-consent";
const CONSENT_VERSION = "2026-07-25";
type Consent = { analytics: boolean; version: string; updatedAt: string };

function readConsent(): Consent | null {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null") as Consent | null;
    return value?.version === CONSENT_VERSION ? value : null;
  } catch {
    return null;
  }
}

export default function AnalyticsConsent() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);
  const initialized = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setOpen(!stored);
  }, []);

  useEffect(() => {
    if (!consent?.analytics) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || host !== "https://eu.i.posthog.com") return;
    let cancelled = false;
    void Promise.all([
      import("posthog-js"),
      fetch("/api/analytics-id", { cache: "no-store" }).then((response) =>
        response.ok ? response.json() as Promise<{ id: string }> : null,
      ),
    ]).then(([module, identity]) => {
      if (cancelled) return;
      const posthog = module.default;
      if (!initialized.current) posthog.init(key, {
        api_host: host,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: "never",
        persistence: "localStorage",
        sanitize_properties: (properties) => {
          delete properties.$current_url;
          delete properties.$referrer;
          delete properties.$ip;
          return properties;
        },
      });
      initialized.current = true;
      if (identity?.id) posthog.identify(identity.id);
      posthog.capture("page_view", { path: window.location.pathname });
    });
    return () => { cancelled = true; };
  }, [consent]);

  useEffect(() => {
    if (!consent?.analytics || !initialized.current) return;
    void import("posthog-js").then(({ default: posthog }) => posthog.capture("page_view", { path: pathname }));
  }, [consent, pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && consent) setOpen(false);
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); (previous || openerRef.current)?.focus(); };
  }, [open, consent]);

  const save = async (analytics: boolean) => {
    const value = { analytics, version: CONSENT_VERSION, updatedAt: new Date().toISOString() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    setConsent(value);
    setOpen(false);
    if (!analytics) {
      const posthog = (await import("posthog-js")).default;
      posthog.opt_out_capturing();
      posthog.stopSessionRecording();
      posthog.reset();
    }
  };

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        style={{ position: "fixed", right: 12, bottom: 12, zIndex: 70, padding: ".45rem .65rem", border: "2px solid #111", borderRadius: 8, background: "#fff", fontWeight: 800 }}
      >
        Soukromí
      </button>
      {open && (
        <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.55)" }}>
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="analytics-title" style={{ width: "min(520px, 100%)", padding: 20, background: "#fff", border: "3px solid #111", borderRadius: 12, boxShadow: "6px 6px 0 #111" }}>
            <h2 id="analytics-title">Nastavení soukromí</h2>
            <p>Nezbytné zpracování zajišťuje přihlášení a chod aplikace a nelze je vypnout. Anonymizovaná produktová analytika PostHog EU je volitelná.</p>
            <p>Analytika neodesílá jméno, e-mail, ID oddílu, obsah formulářů ani úplné URL. Záznam relace je zatím vypnutý.</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => save(false)}>Pouze nezbytné</button>
              <button type="button" onClick={() => save(true)} style={{ fontWeight: 900 }}>Povolit analytiku</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
