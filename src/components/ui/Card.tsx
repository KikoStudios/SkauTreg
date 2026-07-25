import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

type Padding = "none" | "sm" | "md" | "lg";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function Card({
  children,
  className,
  padding = "md",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: Padding;
  interactive?: boolean;
}) {
  return (
    <div className={cx(styles.card, styles[`padding${capitalize(padding)}`], interactive && styles.interactive, className)} {...props}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  href,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      {icon && <div className={styles.statIcon}>{icon}</div>}
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cx(styles.card, styles.paddingLg, styles.stat, styles.interactive)}>
        {content}
      </Link>
    );
  }

  return (
    <Card padding="lg" className={styles.stat} interactive={Boolean(onClick)} onClick={onClick}>
      {content}
    </Card>
  );
}

export function EmptyStateCard({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card padding="lg" className={styles.empty}>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {action}
    </Card>
  );
}

function capitalize(value: Padding) {
  if (value === "none") return "None";
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
