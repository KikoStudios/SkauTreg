import styles from "./TroopWorkspaceHeader.module.css";

type Section = "overview" | "meetings" | "leaders" | "settings";

export default function TroopWorkspaceHeader({ title, description }: { troopId: string; troopName: string; current: Section; title: string; description: string; note?: string }) {
  return (
    <header className={styles.contextShell}>
      <div className={styles.headingCopy}><h1>{title}</h1><p>{description}</p></div>
    </header>
  );
}
