import type { HTMLAttributes, PropsWithChildren } from "react";

export function Surface({
  children,
  className = "",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={`flex flex-col rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_18px_60px_rgba(19,33,44,0.08)] ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
