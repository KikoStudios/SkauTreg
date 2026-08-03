import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost" | "icon";
type ButtonSize = "sm" | "md" | "lg";
type ButtonShape = "default" | "pill" | "circle";

type CommonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  className?: string;
};

type NativeButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkButtonProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    disabled?: boolean;
  };

export type ButtonProps = NativeButtonProps | LinkButtonProps;

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function Button({
  children,
  variant = "primary",
  size = "md",
  shape = variant === "icon" ? "circle" : "default",
  className,
  ...props
}: ButtonProps) {
  const classNames = cx(styles.button, styles[variant], styles[size], styles[shape], className);

  if ("href" in props && props.href) {
    const { href, disabled, ...anchorProps } = props;

    if (disabled) {
      return (
        <span className={classNames} aria-disabled="true">
          {children}
        </span>
      );
    }

    return (
      <Link href={href} className={classNames} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classNames} {...(props as NativeButtonProps)}>
      {children}
    </button>
  );
}
