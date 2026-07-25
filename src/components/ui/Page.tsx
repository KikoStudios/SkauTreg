import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Page.module.css";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function PageHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(styles.header, className)} {...props}>
      {children}
    </div>
  );
}

export function PageTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cx(styles.title, className)} {...props}>
      {children}
    </h1>
  );
}

export function PageActions({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(styles.actions, className)} {...props}>
      {children}
    </div>
  );
}

export function PageToolbar({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(styles.toolbar, className)} {...props}>
      {children}
    </div>
  );
}

export function PageContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(styles.content, className)} {...props}>
      {children}
    </div>
  );
}

export function TableScroller({ children }: { children: ReactNode }) {
  return <div className={styles.tableScroller}>{children}</div>;
}
