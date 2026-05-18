import { Parameters } from 'fast-check';

export const FC_DEFAULTS: Parameters<unknown> = {
  numRuns: 100,
  seed: 42,
  verbose: 0, // 0=none, 1=failures, 2=all
};
