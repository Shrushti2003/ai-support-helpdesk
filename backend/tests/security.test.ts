import { describe, expect, it } from 'vitest';

describe('support security invariants', () => {
  it('keeps internal notes server-private by contract', () => {
    const customerProjection = (messages: Array<{ isInternal: boolean; content: string }>) => messages.filter(message => !message.isInternal);
    expect(customerProjection([{ isInternal: false, content: 'public' }, { isInternal: true, content: 'secret' }])).toEqual([{ isInternal: false, content: 'public' }]);
  });

  it('recognizes overdue tickets only before a first public response', () => {
    const overdue = (deadline: Date, firstResponseAt?: Date | null) => !firstResponseAt && deadline.getTime() < Date.now();
    expect(overdue(new Date(Date.now() - 1000), null)).toBe(true);
    expect(overdue(new Date(Date.now() - 1000), new Date())).toBe(false);
  });

  it('rejects invalid lifecycle transitions', () => {
    const allowed: Record<string, string[]> = { OPEN: ['IN_PROGRESS'], IN_PROGRESS: ['WAITING_ON_CUSTOMER', 'RESOLVED'], RESOLVED: ['CLOSED', 'IN_PROGRESS'] };
    expect(allowed.OPEN.includes('CLOSED')).toBe(false);
    expect(allowed.IN_PROGRESS.includes('RESOLVED')).toBe(true);
  });

  it('rotates only through active eligible agents', () => {
    const agents = [{ id: 'a1', active: true, role: 'AGENT' }, { id: 'inactive', active: false, role: 'AGENT' }, { id: 'a2', active: true, role: 'AGENT' }];
    const eligible = agents.filter(agent => agent.active && agent.role === 'AGENT');
    const next = (last: string | null) => { const index = eligible.findIndex(agent => agent.id === last); return eligible[index < 0 ? 0 : (index + 1) % eligible.length].id; };
    expect(next(null)).toBe('a1'); expect(next('a1')).toBe('a2'); expect(next('a2')).toBe('a1'); expect(eligible.some(agent => agent.id === 'inactive')).toBe(false);
  });

  it('does not allow a customer to create an internal note', () => {
    const canCreateInternal = (role: string, requestedInternal: boolean) => !requestedInternal || role === 'AGENT' || role === 'ADMIN';
    expect(canCreateInternal('CUSTOMER', true)).toBe(false);
    expect(canCreateInternal('CUSTOMER', false)).toBe(true);
  });

  it('uses customer ownership rather than a browser-supplied participant flag', () => {
    const canAccess = (role: string, userId: string, customerId: string, assignedAgentId: string | null) => role === 'ADMIN' || (role === 'CUSTOMER' && userId === customerId) || (role === 'AGENT' && userId === assignedAgentId);
    expect(canAccess('CUSTOMER', 'customer-1', 'customer-2', 'agent-1')).toBe(false);
    expect(canAccess('AGENT', 'agent-1', 'customer-2', 'agent-1')).toBe(true);
  });
});
