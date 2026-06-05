"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LearnSubmitCtaProps = {
  className?: string;
  variant?: "default" | "outline";
};

export function LearnSubmitCta({
  className,
  variant = "outline",
}: LearnSubmitCtaProps) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setLoggedIn(Boolean(data.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  if (loggedIn === null) {
    return (
      <Button variant={variant} className={className} disabled>
        了解
      </Button>
    );
  }

  const href = loggedIn ? "/install" : "/login?next=/install";

  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant }), className)}
    >
      了解
    </Link>
  );
}
