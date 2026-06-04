import type { ReactNode } from "react";
import ComingSoonBadge from "./ComingSoonBadge";

interface VenueSectionCardProps {
  title: string;
  description: string;
  comingSoon?: boolean;
  children?: ReactNode;
  action?: ReactNode;
}

export default function VenueSectionCard({
  title,
  description,
  comingSoon = true,
  children,
  action,
}: VenueSectionCardProps) {
  return (
    <section className="venue-section-card rounded-xl border border-border/80 bg-card/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="font-semibold text-base text-foreground">{title}</h2>
            {comingSoon && <ComingSoonBadge />}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}