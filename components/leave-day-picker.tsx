"use client";

import { SprintWorkingDay } from "@/lib/sprint";
import { cn } from "@/lib/utils";

type LeaveDayPickerProps = {
    days: SprintWorkingDay[];
    selected: string[];
    disabled?: boolean;
    onChange: (next: string[]) => void;
};

export function LeaveDayPicker({ days, selected, disabled, onChange }: LeaveDayPickerProps) {
    const selectedSet = new Set(selected);
    const week1 = days.filter((d) => d.week === 1);
    const week2 = days.filter((d) => d.week === 2);

    const toggle = (iso: string) => {
        if (disabled) return;
        const next = selectedSet.has(iso)
            ? selected.filter((d) => d !== iso)
            : [...selected, iso].sort();
        onChange(next);
    };

    const renderWeek = (label: string, weekDays: SprintWorkingDay[]) => (
        <div className="flex items-center gap-1">
            <span className="w-6 shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </span>
            <div className="flex gap-1">
                {weekDays.map((d) => {
                    const isOn = selectedSet.has(d.iso);
                    return (
                        <button
                            key={d.iso}
                            type="button"
                            disabled={disabled}
                            title={d.shortLabel}
                            onClick={() => toggle(d.iso)}
                            className={cn(
                                "flex h-9 w-9 flex-col items-center justify-center rounded-md border text-[10px] leading-none transition-colors",
                                isOn
                                    ? "border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200"
                                    : "border-input bg-background text-muted-foreground hover:bg-accent",
                                disabled && "cursor-default opacity-70 hover:bg-background"
                            )}
                        >
                            <span className="font-medium">{d.weekday.slice(0, 1)}</span>
                            <span className="mt-0.5 tabular-nums">{d.dayNum}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="space-y-1">
            {renderWeek("W1", week1)}
            {renderWeek("W2", week2)}
        </div>
    );
}
