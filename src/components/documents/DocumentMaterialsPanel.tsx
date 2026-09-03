"use client";

import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

export default function DocumentMaterialsPanel({
  documentId,
  activePageId,
}: {
  documentId: Id<"documents">;
  activePageId: Id<"meeting_pages"> | null;
}) {
  const insights = useQuery(api.documentAI.getPageInsights, activePageId ? { documentId, pageId: activePageId } : "skip");
  const processing = insights?.status === "queued" || insights?.status === "running";
  if (!activePageId || (!processing && (insights?.materials.length ?? 0) === 0)) return null;

  const goToSource = (blockId: string) => {
    window.document.getElementById(`b_${blockId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className={styles.section} aria-labelledby="document-materials-title" aria-busy={processing}>
      <h3 id="document-materials-title" className={styles.sectionTitle}><Package size={15} /> POMŮCKY A PŘÍPRAVA</h3>
      <div className={styles.materialList}>
        {insights?.materials.map((material, index) => (
          <button type="button" key={`${material.blockId}-${material.name}-${index}`} className={styles.materialItem} onClick={() => goToSource(material.blockId)}>
            <span className={styles.materialMark} aria-hidden="true" />
            <span>
              <strong>{material.quantity ? `${material.quantity} · ${material.name}` : material.name}</strong>
              {material.reason && <small>{material.reason}</small>}
            </span>
          </button>
        ))}
        {processing && (insights?.materials.length ?? 0) === 0 && <p className={styles.materialProcessing}>Hledám pomůcky v programu…</p>}
      </div>
    </section>
  );
}
