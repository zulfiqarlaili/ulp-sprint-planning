import Link from "next/link";
import {
  getConfig,
  getSprintRecord,
  getCurrentSprintIndex,
  getNextSprintIndex,
  getSprintStartDate,
  getSprintEndDate,
  formatSprintRelease,
} from "@/lib/sprint";
import { UnboxNextSprint } from "@/components/unbox-next-sprint";
import { BarChart3, Layers, Users } from "lucide-react";

/** Force dynamic rendering so "days remaining" uses current date, not build-time date. */
export const dynamic = "force-dynamic";

function getSprintProgress(config: ReturnType<typeof getConfig>, index: number) {
  const start = getSprintStartDate(config, index);
  const end = getSprintEndDate(config, index);
  const now = new Date();

  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const remainingMs = end.getTime() - now.getTime();

  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  return { daysRemaining, progress };
}

export default function HomePage() {
  const config = getConfig();
  const currentIndex = getCurrentSprintIndex(config);
  const nextIndex = getNextSprintIndex(config);
  const current = getSprintRecord(config, currentIndex);
  const next = getSprintRecord(config, nextIndex);
  const { daysRemaining, progress } = getSprintProgress(config, currentIndex);

  const progressColor =
    daysRemaining <= 1 ? "bg-red-500" : daysRemaining <= 5 ? "bg-amber-500" : "bg-primary";
  const progressTextColor =
    daysRemaining <= 1 ? "text-red-600" : daysRemaining <= 5 ? "text-amber-600" : "text-primary";

  return (
    <div className="space-y-8 sm:space-y-10 pb-12">
      {/* Hero headline */}
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Who&apos;s on duty
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Release Master and Scrum Master for this sprint and the next
        </p>
      </header>

      {/* Current sprint */}
      <section className="max-w-4xl mx-auto">
        <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-6 shadow-lg sm:p-8 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Current sprint
            </p>
            <span className={`text-sm font-semibold ${progressTextColor}`}>
              {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
            </span>
          </div>

          {/* Sprint countdown progress bar */}
          <div className="w-full bg-muted rounded-full h-2 mb-6">
            <div
              className={`h-2 rounded-full transition-all ${progressColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                Sprint {formatSprintRelease(current.sprint)}
              </span>
              <span className="text-xl text-muted-foreground sm:text-2xl">
                · Release {formatSprintRelease(current.release)}
              </span>
            </div>

            <p className="text-sm text-muted-foreground sm:text-base">
              {current.dateRange}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-background/80 border p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Release Master
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                    {current.releaseMaster.charAt(0)}
                  </div>
                  <p className="text-2xl font-bold tracking-tight">
                    {current.releaseMaster}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-background/80 border p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Scrum Master
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                    {current.scrumMaster.charAt(0)}
                  </div>
                  <p className="text-2xl font-bold tracking-tight">
                    {current.scrumMaster}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick action links */}
      <section className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/capacity-planner"
            className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Capacity Planner</p>
              <p className="text-xs text-muted-foreground">Plan team capacity</p>
            </div>
          </Link>
          <Link
            href="/planning-poker"
            className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 group-hover:bg-violet-500/20 transition-colors">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Planning Poker</p>
              <p className="text-xs text-muted-foreground">Estimate stories</p>
            </div>
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 transition-colors">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Sprint History</p>
              <p className="text-xs text-muted-foreground">Past & upcoming sprints</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Next sprint – unbox to reveal */}
      <section className="max-w-2xl mx-auto">
        <UnboxNextSprint
          data={{
            sprintFormatted: formatSprintRelease(next.sprint),
            releaseFormatted: formatSprintRelease(next.release),
            dateRange: next.dateRange,
            releaseMaster: next.releaseMaster,
            scrumMaster: next.scrumMaster,
          }}
        />
      </section>
    </div>
  );
}
