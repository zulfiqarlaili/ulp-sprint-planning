import {
  getConfig,
  getSprintRecord,
  getCurrentSprintIndex,
  getNextSprintIndex,
  formatSprintRelease,
} from "@/lib/sprint";
import { UnboxNextSprint } from "@/components/unbox-next-sprint";

export default function HomePage() {
  const config = getConfig();
  const currentIndex = getCurrentSprintIndex(config);
  const nextIndex = getNextSprintIndex(config);
  const current = getSprintRecord(config, currentIndex);
  const next = getSprintRecord(config, nextIndex);

  return (
    <div className="space-y-8 sm:space-y-12 pb-12">
      {/* Hero headline */}
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Who&apos;s on duty
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Release Master and Scrum Master for this sprint and the next
        </p>
      </header>

      {/* Current sprint – big and at-a-glance */}
      <section className="max-w-4xl mx-auto">
        <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-6 shadow-lg sm:p-8 md:p-10 lg:p-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-6">
            Current sprint
          </p>

          <div className="space-y-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl md:text-6xl">
                Sprint {formatSprintRelease(current.sprint)}
              </span>
              <span className="text-2xl text-muted-foreground sm:text-3xl">
                · Release {formatSprintRelease(current.release)}
              </span>
            </div>

            <p className="text-base text-muted-foreground sm:text-lg">
              {current.dateRange}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 pt-4">
              <div className="rounded-xl bg-background/80 border p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Release Master
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {current.releaseMaster}
                </p>
              </div>
              <div className="rounded-xl bg-background/80 border p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Scrum Master
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {current.scrumMaster}
                </p>
              </div>
            </div>
          </div>
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
