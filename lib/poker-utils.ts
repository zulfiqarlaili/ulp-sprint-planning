// Utility functions for Planning Poker

/**
 * Generate a unique session ID for poker rooms
 * Uses crypto.randomUUID and takes first 8 characters for brevity
 */
export function generateSessionId(): string {
  return crypto.randomUUID().split('-')[0];
}

/**
 * Valid story point values for planning poker
 */
export const VALID_VOTES = ['0.5', '1', '2', '3', '5'] as const;
export type VoteValue = typeof VALID_VOTES[number];

/**
 * Validate if a vote value is valid
 */
export function isValidVote(vote: string): vote is VoteValue {
  return VALID_VOTES.includes(vote as VoteValue);
}

/**
 * Format a vote value for display
 */
export function formatVote(vote: string | null): string {
  if (!vote) return '?';
  return vote;
}

/**
 * Handle duplicate participant names by appending a number suffix
 */
export function getUniqueParticipantName(
  desiredName: string,
  existingNames: string[]
): string {
  if (!existingNames.includes(desiredName)) {
    return desiredName;
  }

  let counter = 2;
  let uniqueName = `${desiredName}-${counter}`;
  
  while (existingNames.includes(uniqueName)) {
    counter++;
    uniqueName = `${desiredName}-${counter}`;
  }
  
  return uniqueName;
}

/**
 * Calculate voting statistics
 */
export function calculateVoteStats(votes: (string | null)[]): {
  average: number | null;
  min: number | null;
  max: number | null;
  consensus: boolean;
} {
  const validVotes = votes
    .filter((v): v is string => v !== null && v !== '')
    .map(v => parseFloat(v));

  if (validVotes.length === 0) {
    return { average: null, min: null, max: null, consensus: false };
  }

  const sum = validVotes.reduce((acc, v) => acc + v, 0);
  const average = sum / validVotes.length;
  const min = Math.min(...validVotes);
  const max = Math.max(...validVotes);
  const consensus = min === max;

  return { average, min, max, consensus };
}
