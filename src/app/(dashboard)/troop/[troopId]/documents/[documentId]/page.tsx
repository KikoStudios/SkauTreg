"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function DocumentRoute() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const troopId = params.troopId as Id<"troops">;
  const documentId = params.documentId as Id<"documents">;
  const document = useQuery(api.documents.get, { documentId });
  useEffect(() => {
    if (!document) return;
    const forwarded = new URLSearchParams(searchParams.toString());
    forwarded.set("troopId", troopId);
    forwarded.set("documentId", documentId);
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    router.replace(`/rady/${document.meetingId}?${forwarded.toString()}${hash}`);
  }, [document, documentId, router, searchParams, troopId]);
  if (document === undefined) return <div style={{ padding: "2rem" }}>Otevírám dokument…</div>;
  if (document === null) return <div style={{ padding: "2rem" }}>Dokument nebyl nalezen.</div>;
  return <div style={{ padding: "2rem" }}>Připravuji editor…</div>;
}
