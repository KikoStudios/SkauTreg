import Link from "next/link";
import styles from "./LegalPage.module.css";

export type LegalSection = { id: string; title: string; content: React.ReactNode };

export default function LegalPage({
  title,
  lead,
  sections,
}: {
  title: string;
  lead: string;
  sections: LegalSection[];
}) {
  const navigation = (
    <nav aria-label="Obsah dokumentu">
      {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
    </nav>
  );
  return (
    <div className={styles.page}>
      <header className={styles.header}><Link href="/">← SkauTreg</Link></header>
      <div className={styles.layout}>
        <aside className={styles.toc}><strong>Obsah</strong>{navigation}</aside>
        <main className={styles.content}>
          <h1>{title}</h1>
          <p className={styles.lead}>{lead}</p>
          <p className={styles.review}><strong>Před nasazením:</strong> tento text musí schválit provozovatel a právník.</p>
          <details className={styles.mobileToc}><summary>Obsah dokumentu</summary>{navigation}</details>
          {sections.map((section) => (
            <section className={styles.section} id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
