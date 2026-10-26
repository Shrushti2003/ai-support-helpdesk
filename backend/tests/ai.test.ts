import { describe, expect, it } from 'vitest';
import { categorize } from '../src/ai.js';

describe('AI fallback behavior', () => {
  it('fails explicitly when no provider key is configured', async () => {
    await expect(categorize('Login problem', 'I cannot sign in')).rejects.toThrow('AI_UNAVAILABLE');
  });
});
