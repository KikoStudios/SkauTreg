"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ReactElement, useEffect, useMemo, useState } from "react";
import styles from "./UpdateNotification.module.css";

type UpdateEntry = {
  id: string;
  version: string;
  title: string;
  tags: string[];
  description: string;
  releaseDate: string;
  rawName?: string;
  markdown?: string;
  html?: string;
  createdWhen?: string;
  modifiedWhen?: string;
};

const PENDING_KEY = "skautreg_updates_pending";

export function UpdateNotification() {
  const tracking = useQuery(api.appVersions.getUserVersionTracking);
  const markAsSeen = useMutation(api.appVersions.markVersionAsSeen);
  const dismissVersion = useMutation(api.appVersions.dismissVersion);

  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<UpdateEntry[] | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [updatesLoaded, setUpdatesLoaded] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setForceUpdate(params.get("forceUpdate") === "1");

    const pendingRaw = window.localStorage.getItem(PENDING_KEY);
    if (pendingRaw) {
      try {
        const parsed = JSON.parse(pendingRaw) as { updates?: UpdateEntry[] };
        if (parsed.updates && parsed.updates.length > 0) {
          setPendingUpdates(parsed.updates);
          setShowChangelog(true);
        }
      } catch (error) {
        console.error("[Updates] Failed to parse pending updates:", error);
      } finally {
        window.localStorage.removeItem(PENDING_KEY);
      }
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadUpdates = async () => {
      try {
        const response = await fetch("/api/public/version/current");
        if (!response.ok) {
          throw new Error(`Failed to fetch updates: ${response.status}`);
        }

        const data = await response.json();
        if (!isActive) return;

        const fetchedUpdates = (data.updates || []) as UpdateEntry[];
        setUpdates(fetchedUpdates);
        setLatestVersion(data.latestVersion || null);
        setUpdatesLoaded(true);
      } catch (error) {
        console.error("[Updates] Failed to load updates:", error);
        setUpdatesLoaded(true);
      }
    };

    loadUpdates();

    return () => {
      isActive = false;
    };
  }, []);

  const hasUpdate = useMemo(() => {
    if (forceUpdate) return true;
    if (!latestVersion) return false;
    if (!tracking) return true;
    if (tracking.dismissedVersions?.includes(latestVersion)) return false;
    return tracking.lastSeenVersion !== latestVersion;
  }, [forceUpdate, latestVersion, tracking]);

  useEffect(() => {
    if (pendingUpdates && pendingUpdates.length > 0) return;
    if (!hasUpdate) return;
    if (!updatesLoaded && !forceUpdate) return;

    const timer = setTimeout(() => {
      setShowNotification(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [forceUpdate, hasUpdate, pendingUpdates, updatesLoaded]);

  const handleReload = () => {
    if (typeof window === "undefined") return;
    if (updates.length > 0) {
      window.localStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          updates,
          storedAt: new Date().toISOString(),
        })
      );
    }
    window.location.reload();
  };

  const handleShowChangelog = () => {
    setShowNotification(false);
    setShowChangelog(true);
  };

  const handleDismiss = async () => {
    if (!latestVersion) return;
    await dismissVersion({ version: latestVersion });
    setShowNotification(false);
  };

  const handleCloseChangelog = async () => {
    if (latestVersion) {
      await markAsSeen({ version: latestVersion });
    }
    setShowChangelog(false);
    setPendingUpdates(null);
  };

  const displayedUpdates = pendingUpdates ?? updates;

  if (!hasUpdate && !pendingUpdates) return null;

  return (
    <>
      {showNotification && (
        <div className={styles.notification}>
          <div className={styles.notificationContent}>
            <div className={styles.message}>
              <div className={styles.messageHeader}>Nová aktualizace</div>
              <div className={styles.chipRow}>
                <span className={styles.versionText}>
                  {updates[0]?.version || latestVersion || "Beta"}
                </span>
                {updates[0]?.tags?.map((tag) => (
                  <span key={tag} className={styles.tagChip}>
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={handleReload}>
                AKTUALIZOVAT
              </button>
              <button className={styles.secondaryBtn} onClick={handleDismiss}>
                MOŽNÁ POZDĚJI
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangelog && displayedUpdates.length > 0 && (
        <ChangelogModal
          updates={displayedUpdates}
          latestVersion={latestVersion}
          onClose={handleCloseChangelog}
        />
      )}
    </>
  );
}

interface ChangelogModalProps {
  updates: UpdateEntry[];
  latestVersion: string | null;
  onClose: () => void;
}

function ChangelogModal({ updates, latestVersion, onClose }: ChangelogModalProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(
    () => new Set(updates.slice(1).map((_, index) => index + 1))
  );

  const toggleSection = (index: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2>Co je noveho</h2>
            {latestVersion && (
              <p className={styles.releaseDate}>Aktualizace do verze {latestVersion}</p>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.changelog}>
            {updates.map((update, index) => (
              <div key={update.id} className={styles.section}>
                <div
                  className={styles.sectionHeader}
                  onClick={() => toggleSection(index)}
                >
                  <span className={styles.collapseIcon}>
                    {collapsed.has(index) ? "▶" : "▼"}
                  </span>
                  <div className={styles.sectionTitle}>
                    <h3>
                      {update.title || "Aktualizace"} {update.version ? `(${update.version})` : ""}
                    </h3>
                    {update.tags.length > 0 && (
                      <div className={styles.tags}>
                        {update.tags.map((tag) => (
                          <span key={`${update.id}-${tag}`} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {!collapsed.has(index) && (
                  <div className={styles.sectionContent}>
                    {update.description && (
                      <p className={styles.descriptionBlockText}>{update.description}</p>
                    )}
                    {update.markdown && <MarkdownRenderer content={update.markdown} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.primaryBtn} onClick={onClose}>
            Rozumim
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkdownRenderer({ content }: { content?: string }) {
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  if (!content) return null;

  const sections = parseMarkdownSections(content);

  const toggleSection = (index: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className={styles.markdownRenderer}>
      {sections.map((section, index) => (
        <div key={index} className={styles.section}>
          {section.title && (
            <div className={styles.sectionHeader} onClick={() => toggleSection(index)}>
              <span className={styles.collapseIcon}>
                {collapsedSections.has(index) ? "▶" : "▼"}
              </span>
              <h3>{section.title}</h3>
            </div>
          )}
          {!collapsedSections.has(index) && (
            <div className={styles.sectionContent}>
              {renderMarkdownContent(section.content)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function parseMarkdownSections(markdown: string | undefined) {
  if (!markdown) return [];
  const lines = markdown.split("\n");
  const sections: { title?: string; content: string }[] = [];
  let currentSection: { title?: string; content: string } = { content: "" };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headingMatch[2],
        content: "",
      };
    } else {
      currentSection.content += `${line}\n`;
    }
  }

  if (currentSection.content.trim() || currentSection.title) {
    sections.push(currentSection);
  }

  return sections;
}

function renderMarkdownContent(content: string) {
  const lines = content.split("\n");
  const elements: ReactElement[] = [];

  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`}>
          {listItems.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre key={`code-${elements.length}`}>
          <code>{codeBlockContent.join("\n")}</code>
        </pre>
      );
      codeBlockContent = [];
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      listItems.push(line.trim().substring(2));
      continue;
    }

    flushList();

    if (!line.trim()) {
      continue;
    }

    elements.push(
      <p
        key={`p-${elements.length}`}
        dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
      />
    );
  }

  flushList();
  flushCodeBlock();

  return elements;
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}
