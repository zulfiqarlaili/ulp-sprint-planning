"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConfig, getHistory, formatSprintRelease } from "@/lib/sprint";
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
import { pb } from "@/lib/pocketbase";
import { ExternalLink, Loader2 } from "lucide-react";

type SprintPlan = {
  id: string;
  name: string;
};

export default function HistoryPage() {
  const config = getConfig();
  const history = getHistory(config, 24, 12);
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

  // Helper to find capacity plan by sprint name
  const findPlanBySprintNumber = (sprintNum: number) => {
    const sprintStr = formatSprintRelease(sprintNum);
    return sprintPlans.find(p => p.name.includes(sprintStr));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sprint history</h1>
        <p className="text-muted-foreground mt-1">
          Past and upcoming sprints with Release Master and Scrum Master (newest first).
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading capacity plans...
        </div>
      )}

      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {history.map((row) => {
          const plan = findPlanBySprintNumber(row.sprint);
          return (
            <div
              key={row.sprint}
              className={`rounded-md border p-4 ${
                row.isCurrent
                  ? "border-l-4 border-l-primary bg-primary/10 font-medium"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-semibold tabular-nums">
                  {formatSprintRelease(row.sprint)}
                </span>
                {row.isCurrent && (
                  <Badge variant="default" className="text-xs font-semibold">
                    Current
                  </Badge>
                )}
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
                  <dt className="text-muted-foreground">Start date</dt>
                  <dd>{row.startDate}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Date range</dt>
                  <dd className="text-muted-foreground">{row.dateRange}</dd>
                </div>
              </dl>
              <div className="mt-4 pt-3 border-t">
                {plan ? (
                  <Link href={`/capacity-planner?sprintId=${plan.id}`}>
                    <Button variant="outline" size="sm" className="w-full min-h-[44px] sm:w-auto">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Plan
                    </Button>
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">No plan saved</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sprint</TableHead>
              <TableHead>Release</TableHead>
              <TableHead>Release Master</TableHead>
              <TableHead>Scrum Master</TableHead>
              <TableHead>Start date</TableHead>
              <TableHead>Date range</TableHead>
              <TableHead className="text-right">Capacity Plan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((row) => {
              const plan = findPlanBySprintNumber(row.sprint);
              return (
                <TableRow
                  key={row.sprint}
                  className={
                    row.isCurrent
                      ? "border-l-4 border-l-primary bg-primary/20 font-medium ring-2 ring-primary/25 ring-inset hover:bg-primary/25"
                      : undefined
                  }
                >
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {formatSprintRelease(row.sprint)}
                      {row.isCurrent && (
                        <Badge variant="default" className="text-xs font-semibold">
                          Current
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className={row.isCurrent ? "font-semibold tabular-nums" : undefined}>
                    {formatSprintRelease(row.release)}
                  </TableCell>
                  <TableCell className={row.isCurrent ? "font-semibold" : undefined}>
                    {row.releaseMaster}
                  </TableCell>
                  <TableCell className={row.isCurrent ? "font-semibold" : undefined}>
                    {row.scrumMaster}
                  </TableCell>
                  <TableCell>{row.startDate}</TableCell>
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
                      <span className="text-xs text-muted-foreground">No plan saved</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
