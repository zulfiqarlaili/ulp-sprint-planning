export type Role = 'Engineer' | 'QA' | 'PM';

export const TEAM_MEMBERS_CONFIG = [
    { name: 'Zul', role: 'Engineer' },
    { name: 'Eizlan', role: 'Engineer' },
    { name: 'Minker', role: 'Engineer' },
    { name: 'Anessa', role: 'QA' },
    { name: 'Rubee', role: 'QA' },
    // Fahmi is excluded from capacity planning
];

export const CONSTANTS = {
    HOURS_TO_POINTS: 0.25,
    DAYS_TO_POINTS: 2,
    DEV_CAPACITY_FACTOR: 0.8,
    QA_CAPACITY_FACTOR: 1.0,
    CODE_FREEZE_FACTOR: 0.8,
    BUFFER_FACTOR: 1.2, // Max capacity buffer
};
