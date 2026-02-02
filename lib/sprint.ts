import configJson from "@/data/config.json";

export type SprintConfig = {
  firstSprintNumber: number;
  firstSprintStartDate: string;
  sprintLengthDays: number;
  releaseMasters: string[];
  scrumMasters: string[];
  releaseMasterIndexAtFirstSprint: number;
  scrumMasterIndexAtFirstSprint: number;
};

export type SprintRecord = {
  sprint: number;
  release: number;
  releaseMaster: string;
  scrumMaster: string;
  startDate: string;
  dateRange: string;
  isCurrent?: boolean;
};

const config = configJson as SprintConfig;

/** Parse dd/mm/yyyy to Date (UTC noon to avoid timezone shifts). */
export function parseDdMmYyyy(s: string): Date {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

/** Format Date as dd/mm/yyyy. */
export function formatDdMmYyyy(d: Date): string {
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** Sprint index (0-based) that contains the given date. Can be negative for dates before first sprint. */
export function getSprintIndexForDate(
  cfg: SprintConfig,
  date: Date
): number {
  const first = parseDdMmYyyy(cfg.firstSprintStartDate);
  const firstMs = first.getTime();
  const dateMs = date.getTime();
  const daysSinceFirst = (dateMs - firstMs) / (24 * 60 * 60 * 1000);
  return Math.floor(daysSinceFirst / cfg.sprintLengthDays);
}

/** Start date of the sprint at the given index. */
export function getSprintStartDate(cfg: SprintConfig, index: number): Date {
  const first = parseDdMmYyyy(cfg.firstSprintStartDate);
  const ms = first.getTime() + index * cfg.sprintLengthDays * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

/** End date of the sprint: Friday of the second week (start Monday + 11 days). */
const SPRINT_END_OFFSET_DAYS = 11;

export function getSprintEndDate(cfg: SprintConfig, index: number): Date {
  const start = getSprintStartDate(cfg, index);
  return new Date(
    start.getTime() + SPRINT_END_OFFSET_DAYS * 24 * 60 * 60 * 1000
  );
}

/** Format as "dd/mm/yyyy – dd/mm/yyyy". */
export function formatDateRange(start: Date, end: Date): string {
  return `${formatDdMmYyyy(start)} – ${formatDdMmYyyy(end)}`;
}

/** Safe modulo for negative indices (e.g. -1 % 3 → 2). */
function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Release Master for the given sprint index. */
export function getReleaseMaster(cfg: SprintConfig, index: number): string {
  const i = mod(
    cfg.releaseMasterIndexAtFirstSprint + index,
    cfg.releaseMasters.length
  );
  return cfg.releaseMasters[i];
}

/** Scrum Master for the given sprint index. */
export function getScrumMaster(cfg: SprintConfig, index: number): string {
  const i = mod(
    cfg.scrumMasterIndexAtFirstSprint + index,
    cfg.scrumMasters.length
  );
  return cfg.scrumMasters[i];
}

/** Sprint number (e.g. 1.164, 1.165, 1.166) for the given index. Excel format: major version 1, sequence 164+index. */
export function getSprintNumber(cfg: SprintConfig, index: number): number {
  const major = Math.floor(cfg.firstSprintNumber);
  const sequenceStart = Math.round(
    (cfg.firstSprintNumber - major) * 1000
  );
  return major + (sequenceStart + index) / 1000;
}

/** Release number (e.g. 1.163, 1.164) for the given index. Release = Sprint - 0.001. */
export function getReleaseNumber(cfg: SprintConfig, index: number): number {
  const firstRelease = cfg.firstSprintNumber - 0.001;
  const major = Math.floor(firstRelease);
  const sequenceStart = Math.round((firstRelease - major) * 1000);
  return major + (sequenceStart + index) / 1000;
}

/** Format sprint/release number like Excel: 3 decimal places (e.g. 1.164, 1.163). */
export function formatSprintRelease(value: number): string {
  return value.toFixed(3);
}

/** Full sprint record for the given index. */
export function getSprintRecord(
  cfg: SprintConfig,
  index: number
): SprintRecord {
  const start = getSprintStartDate(cfg, index);
  const end = getSprintEndDate(cfg, index);
  const sprintNum = getSprintNumber(cfg, index);
  const releaseNum = getReleaseNumber(cfg, index);
  return {
    sprint: sprintNum,
    release: releaseNum,
    releaseMaster: getReleaseMaster(cfg, index),
    scrumMaster: getScrumMaster(cfg, index),
    startDate: formatDdMmYyyy(start),
    dateRange: formatDateRange(start, end),
  };
}

/** Current sprint index (sprint containing today). */
export function getCurrentSprintIndex(cfg: SprintConfig): number {
  return getSprintIndexForDate(cfg, new Date());
}

/** Next sprint index (current + 1). */
export function getNextSprintIndex(cfg: SprintConfig): number {
  return getCurrentSprintIndex(cfg) + 1;
}

/** History: sprint records for indices [current - pastCount, current + futureCount], newest first. Marks current sprint with isCurrent. */
export function getHistory(
  cfg: SprintConfig,
  pastCount: number,
  futureCount: number
): SprintRecord[] {
  const current = getCurrentSprintIndex(cfg);
  const records: SprintRecord[] = [];
  for (let i = current - pastCount; i <= current + futureCount; i++) {
    const record = getSprintRecord(cfg, i);
    record.isCurrent = i === current;
    records.push(record);
  }
  records.sort((a, b) => b.sprint - a.sprint);
  return records;
}

/** Validate that RM and SM are never the same for sprints in range [currentIndex, currentIndex + count). Throws if invalid. */
export function validateNoSamePerson(
  cfg: SprintConfig,
  currentIndex: number,
  count: number = 24
): void {
  for (let i = currentIndex; i < currentIndex + count; i++) {
    if (i < 0) continue;
    const rm = getReleaseMaster(cfg, i);
    const sm = getScrumMaster(cfg, i);
    if (rm === sm) {
      throw new Error(
        `Config invalid: same person (${rm}) is Release Master and Scrum Master for sprint index ${i}. Reorder releaseMasters or scrumMasters so they never clash.`
      );
    }
  }
}

/** Get the app config (single source). Validates RM !== SM for the next 24 sprints; throws if invalid. */
export function getConfig(): SprintConfig {
  const current = getCurrentSprintIndex(config);
  validateNoSamePerson(config, current, 24);
  return config;
}
