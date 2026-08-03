import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import styles from "./Modal.module.css";

type DivProps = HTMLAttributes<HTMLDivElement>;

export function ModalShell({
  children,
  className,
  onClose,
  width,
  maxHeight,
  ...props
}: DivProps & {
  children: ReactNode;
  onClose?: () => void;
  width?: string;
  maxHeight?: string;
}) {
  const style = {
    ...(width ? { "--modal-width": width } : null),
    ...(maxHeight ? { "--modal-max-height": maxHeight } : null),
    ...props.style,
  } as CSSProperties;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={[styles.shell, className].filter(Boolean).join(" ")}
        onClick={(event) => event.stopPropagation()}
        {...props}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children, className, ...props }: DivProps) {
  return (
    <div className={[styles.header, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}

export function ModalTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={[styles.title, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </h2>
  );
}

export function ModalBody({ children, className, ...props }: DivProps) {
  return (
    <div className={[styles.body, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className, ...props }: DivProps) {
  return (
    <div className={[styles.footer, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}

export function ModalCloseButton({ onClick, "aria-label": ariaLabel = "Zavřít" }: { onClick: () => void; "aria-label"?: string }) {
  return (
    <Button type="button" variant="icon" size="sm" shape="circle" onClick={onClick} aria-label={ariaLabel}>
      <X size={20} strokeWidth={3} />
    </Button>
  );
}
