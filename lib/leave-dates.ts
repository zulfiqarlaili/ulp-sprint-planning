export function parseLeaveDates(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((d): d is string => typeof d === "string" && d.length > 0).sort();
    }
    if (typeof value === "string" && value.trim()) {
        try {
            return parseLeaveDates(JSON.parse(value));
        } catch {
            return [];
        }
    }
    return [];
}

export function effectiveLeaveDays(leaveDates: string[], leaveDays: number): number {
    return leaveDates.length > 0 ? leaveDates.length : leaveDays;
}
