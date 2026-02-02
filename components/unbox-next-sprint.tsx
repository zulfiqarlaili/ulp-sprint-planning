"use client";

import { useState } from "react";
import { ChevronDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type NextSprintData = {
  sprintFormatted: string;
  releaseFormatted: string;
  dateRange: string;
  releaseMaster: string;
  scrumMaster: string;
};

type Props = {
  data: NextSprintData;
};

export function UnboxNextSprint({ data }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden",
        open
          ? "border-primary/40 bg-primary/5 shadow-lg"
          : "border-muted-foreground/25 bg-muted/30 hover:border-primary/20 hover:bg-muted/50"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-4 sm:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Coming up next
            </p>
            <p className="text-xl font-bold tracking-tight">
              {open ? "Tap to close" : "Unbox next sprint"}
            </p>
          </div>
        </span>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted transition-transform duration-300",
            open && "rotate-180"
          )}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/50 px-4 py-4 sm:px-6 sm:py-6 space-y-5">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                Sprint {data.sprintFormatted}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                Release {data.releaseFormatted}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{data.dateRange}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Release Master
                </dt>
                <dd className="mt-1 text-lg font-semibold">{data.releaseMaster}</dd>
              </div>
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Scrum Master
                </dt>
                <dd className="mt-1 text-lg font-semibold">{data.scrumMaster}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
