import { cn } from "@/lib/utils";

/// Privacyfundme mark — a private donation container:
///   - sharp square frame (the vault / privacy boundary)
///   - horizontal coin slot near the top (donations enter)
///   - filled yellow value-dot inside (the cause / contained funds)
/// Pure wireframe, no gradients, single accent color via currentColor so it
/// inherits any text colour / hover state. Designed to read at 16px favicon
/// size and scale cleanly to any header / hero usage.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
      aria-hidden="true"
    >
      {/* Outer container frame */}
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Coin / donation slot */}
      <rect x="7" y="6.5" width="10" height="1.5" fill="currentColor" />
      {/* Contained value */}
      <circle cx="12" cy="14.5" r="2.6" fill="currentColor" />
      {/* Subtle inner crop bracket (left), gives the wireframe a built-in feel */}
      <path
        d="M5 17.5 L5 19 L6.5 19"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      {/* Inner crop bracket (right) */}
      <path
        d="M19 17.5 L19 19 L17.5 19"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
    </svg>
  );
}

/// Mark + wordmark, sized + styled inline. Use as a Link child in the header.
export function Logo({
  className,
  markClassName,
  textClassName,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2 sm:gap-2.5", className)}>
      <LogoMark className={cn("h-4 w-4 sm:h-5 sm:w-5", markClassName)} />
      <span
        className={cn(
          "font-mono text-xs font-semibold uppercase tracking-tight sm:text-sm",
          textClassName,
        )}
      >
        Confidential GoFundMe
      </span>
    </span>
  );
}
