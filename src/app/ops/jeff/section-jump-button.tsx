"use client";

import type { ReactNode } from "react";

type SectionJumpButtonProps = {
  children: ReactNode;
  className?: string;
  targetId: string;
  title?: string;
};

export function SectionJumpButton({ children, className, targetId, title }: SectionJumpButtonProps) {
  const id = targetId.replace(/^#/, "");

  return (
    <a
      className={className}
      href={`#${id}`}
      onClick={() => {
        const target = document.getElementById(id);
        if (!target) return;

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${id}`);
      }}
      role="button"
      title={title}
    >
      {children}
    </a>
  );
}
