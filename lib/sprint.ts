import configJson from "@/data/config.json";

export type SprintConfig = {
  firstSprintNumber: number;
  /** Last sprint number to include in history (inclusive), e.g. 1.230. */
  historyThroughSprintNumber?: number;
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

/** Format Date as yyyy-mm-dd (UTC). */
export function formatIsoYyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Weekdays (Mon–Fri) in the sprint, in order. Typically 10 dates. */
export function getSprintWorkingDates(cfg: SprintConfig, index: number): Date[] {
  const start = getSprintStartDate(cfg, index);
  const dates: Date[] = [];
  for (let offset = 0; offset < cfg.sprintLengthDays; offset++) {
    const d = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(d);
  }
  return dates;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type SprintWorkingDay = {
  iso: string;
  weekday: string;
  dayNum: number;
  week: 1 | 2;
  shortLabel: string;
};

export function getSprintWorkingDays(cfg: SprintConfig, index: number): SprintWorkingDay[] {
  return getSprintWorkingDates(cfg, index).map((d, i) => {
    const weekday = WEEKDAY_SHORT[d.getUTCDay()];
    const dayNum = d.getUTCDate();
    return {
      iso: formatIsoYyyyMmDd(d),
      weekday,
      dayNum,
      week: i < 5 ? 1 : 2,
      shortLabel: `${weekday} ${dayNum}`,
    };
  });
}

/** Parse "Sprint 1.195.0" or "Sprint 1.195" to 1.195. */
export function parseSprintNameToNumber(name: string): number | null {
  const match = name.match(/(\d+)\.(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 1000;
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

/** Sprint index for a sprint number such as 1.230, relative to firstSprintNumber. */
export function getIndexForSprintNumber(cfg: SprintConfig, sprintNumber: number): number {
  const major = Math.floor(cfg.firstSprintNumber);
  const sequenceStart = Math.round((cfg.firstSprintNumber - major) * 1000);
  const sequence = Math.round((sprintNumber - Math.floor(sprintNumber)) * 1000);
  return sequence - sequenceStart;
}

/** History: sprint records newest first. Starts at the configured first sprint (index 0). Ends at historyThroughSprintNumber when set, otherwise current + futureCount. Always includes the current sprint. */
export function getHistory(
  cfg: SprintConfig,
  pastCount: number,
  futureCount: number
): SprintRecord[] {
  const current = getCurrentSprintIndex(cfg);
  const records: SprintRecord[] = [];
  let startIndex = Math.max(0, current - pastCount);
  let endIndex = current + futureCount;
  if (cfg.historyThroughSprintNumber != null) {
    startIndex = 0;
    endIndex = Math.max(
      current,
      getIndexForSprintNumber(cfg, cfg.historyThroughSprintNumber)
    );
  }
  for (let i = startIndex; i <= endIndex; i++) {
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

/** Get the app config (single source). Validates RM !== SM through the history end sprint (or the next 24). */
export function getConfig(): SprintConfig {
  const current = getCurrentSprintIndex(config);
  const throughIndex =
    config.historyThroughSprintNumber != null
      ? getIndexForSprintNumber(config, config.historyThroughSprintNumber)
      : current + 24;
  validateNoSamePerson(config, 0, Math.max(throughIndex, current) + 1);
  return config;
}
