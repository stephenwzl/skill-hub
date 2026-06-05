import { cn } from "@/lib/utils";

/** 落地页内容区定宽：宽屏两侧留白，内容居中 */
export const LANDING_CONTENT_MAX = "max-w-[1080px]";

export function LandingContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full", LANDING_CONTENT_MAX, "px-8", className)}>
      {children}
    </div>
  );
}
