export interface Goal {
  id: string;
  name: string;
  targetSen: number;
  savedSen: number;
  createdAt: string; // ISO timestamp
}

export const GOAL_NAME_MAX_LENGTH = 40;

export interface GoalProgress {
  ratio: number; // 0..1, capped
  remainingSen: number; // never negative
  isComplete: boolean;
}

export function goalProgress({ targetSen, savedSen }: Pick<Goal, 'targetSen' | 'savedSen'>): GoalProgress {
  return {
    ratio: targetSen > 0 ? Math.min(savedSen / targetSen, 1) : 0,
    remainingSen: Math.max(targetSen - savedSen, 0),
    isComplete: savedSen >= targetSen,
  };
}

// Adds a deposit (positive) or withdrawal (negative); savings never drop below zero.
export function applyContribution(goal: Goal, deltaSen: number): Goal {
  return { ...goal, savedSen: Math.max(goal.savedSen + deltaSen, 0) };
}

export function isGoalList(value: unknown): value is Goal[] {
  return (
    Array.isArray(value) &&
    value.every(
      (g) =>
        typeof g === 'object' &&
        g !== null &&
        typeof g.id === 'string' &&
        typeof g.name === 'string' &&
        Number.isInteger(g.targetSen) &&
        Number.isInteger(g.savedSen) &&
        typeof g.createdAt === 'string',
    )
  );
}
