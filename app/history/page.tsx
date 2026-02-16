"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConfig, getHistory, getCurrentSprintIndex, getSprintNumber, formatSprintRelease } from "@/lib/sprint";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { pb } from "@/lib/pocketbase";
import { ExternalLink } from "lucide-react";

type SprintPlan = {
  id: string;
  name: string;
};

function getSprintStatus(sprintNum: number, currentSprintNum: number): "past" | "current" | "upcoming" {
  const diff = sprintNum - currentSprintNum;
  if (Math.abs(diff) < 0.0001) return "current";
  return diff < 0 ? "past" : "upcoming";
}

function StatusBadge({ status }: { status: "past" | "current" | "upcoming" }) {
  switch (status) {
    case "current":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 text-xs">Active</Badge>;
    case "upcoming":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 text-xs">Upcoming</Badge>;
    case "past":
      return <Badge variant="secondary" className="text-xs">Completed</Badge>;
  }
}

export default function HistoryPage() {
  const config = getConfig();
  const history = getHistory(config, 24, 12);
  const currentIndex = getCurrentSprintIndex(config);
  const currentSprintNum = getSprintNumber(config, currentIndex);
  const [sprintPlans, setSprintPlans] = useState<SprintPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        const result = await pb.collection('sprints').getList(1, 100, {
          sort: '-created',
          fields: 'id,name'
        });
        setSprintPlans(result.items.map(i => ({ id: i.id, name: i.name })));
      } catch (e) {
        console.error("Failed to load sprint plans:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadPlans();
  }, []);

  const findPlanBySprintNumber = (sprintNum: number) => {
    const sprintStr = formatSprintRelease(sprintNum);
    return sprintPlans.find(p => p.name.includes(sprintStr));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sprint History</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Past and upcoming sprints with Release Master and Scrum Master, newest first.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      )}

      {/* Mobile: card list */}
      {!isLoading && (
        <div className="md:hidden space-y-3">
          {history.map((row) => {
            const plan = findPlanBySprintNumber(row.sprint);
            const status = getSprintStatus(row.sprint, currentSprintNum);
            return (
              <div
                key={row.sprint}
                className={`rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                  row.isCurrent
                    ? "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                    : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="font-semibold tabular-nums">
                    {formatSprintRelease(row.sprint)}
                  </span>
                  <StatusBadge status={status} />
                  <span className="text-muted-foreground text-sm">
                    Release {formatSprintRelease(row.release)}
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Release Master</dt>
                    <dd className={row.isCurrent ? "font-semibold" : ""}>{row.releaseMaster}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Scrum Master</dt>
                    <dd className={row.isCurrent ? "font-semibold" : ""}>{row.scrumMaster}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Date range</dt>
                    <dd className="text-muted-foreground">{row.dateRange}</dd>
                  </div>
                </dl>
                {plan && (
                  <div className="mt-4 pt-3 border-t">
                    <Link href={`/capacity-planner?sprintId=${plan.id}`}>
                      <Button variant="outline" size="sm" className="w-full min-h-[44px] sm:w-auto">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Plan
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop: table */}
      {!isLoading && (
        <div className="hidden md:block rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sprint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Release</TableHead>
                <TableHead>Release Master</TableHead>
                <TableHead>Scrum Master</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead className="text-right">Capacity Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((row) => {
                const plan = findPlanBySprintNumber(row.sprint);
                const status = getSprintStatus(row.sprint, currentSprintNum);
                return (
                  <TableRow
                    key={row.sprint}
                    className={`transition-colors hover:bg-muted/50 ${
                      row.isCurrent
                        ? "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20 font-medium"
                        : ""
                    }`}
                  >
                    <TableCell className="font-medium tabular-nums">
                      {formatSprintRelease(row.sprint)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatSprintRelease(row.release)}
                    </TableCell>
                    <TableCell className={row.isCurrent ? "font-semibold" : undefined}>
                      {row.releaseMaster}
                    </TableCell>
                    <TableCell className={row.isCurrent ? "font-semibold" : undefined}>
                      {row.scrumMaster}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.dateRange}
                    </TableCell>
                    <TableCell className="text-right">
                      {plan ? (
                        <Link href={`/capacity-planner?sprintId=${plan.id}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Plan
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
