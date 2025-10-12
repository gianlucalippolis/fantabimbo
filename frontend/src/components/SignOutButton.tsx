"use client";

import { signOut } from "next-auth/react";
import { type PropsWithChildren } from "react";

interface SignOutButtonProps {
  className?: string;
  callbackUrl?: string;
}

export function SignOutButton({
  className,
  callbackUrl = "/login",
  children,
}: PropsWithChildren<SignOutButtonProps>) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => signOut({ callbackUrl })}
    >
      {children ?? "Esci"}
    </button>
  );
}
