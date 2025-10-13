import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary";

interface BaseProps {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonElementProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type AnchorElementProps = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonElementProps | AnchorElementProps;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    fullWidth = false,
    className,
    children,
    ...rest
  } = props;

  const classes = [
    styles.base,
    styles[variant],
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in rest && rest.href) {
    const { href, ...anchorProps } = rest;
    const isDisabled =
      "aria-disabled" in anchorProps ? anchorProps["aria-disabled"] : undefined;
    return (
      <Link
        href={href}
        {...anchorProps}
        className={classes}
        aria-disabled={isDisabled ? true : undefined}
      >
        {children}
      </Link>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button {...buttonProps} className={classes}>
      {children}
    </button>
  );
}
