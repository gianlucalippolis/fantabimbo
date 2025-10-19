import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";

interface BaseProps {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
  isLoading?: boolean;
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
    isLoading = false,
    ...rest
  } = props;

  const classes = [
    styles.base,
    styles[variant],
    fullWidth ? styles.fullWidth : "",
    isLoading ? styles.loading : "",
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
        aria-disabled={isDisabled || isLoading ? true : undefined}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner} />
            <span className={styles.loadingText}>{children}</span>
          </>
        ) : (
          children
        )}
      </Link>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonProps}
      className={classes}
      disabled={buttonProps.disabled || isLoading}
    >
      {isLoading ? (
        <>
          <span className={styles.spinner} />
          <span className={styles.loadingText}>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
