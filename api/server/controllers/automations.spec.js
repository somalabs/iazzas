jest.mock('@librechat/api', () => ({
  validateSchedule: jest.fn(() => new Date('2026-06-01T12:00:00.000Z')),
  ScheduleValidationError: class ScheduleValidationError extends Error {
    constructor(code) {
      super(code);
      this.name = 'ScheduleValidationError';
      this.code = code;
    }
  },
}));
jest.mock('~/server/services/Automations/repository');
jest.mock('~/server/services/Automations/scheduler', () => ({
  registerAutomation: jest.fn(),
  unregisterAutomation: jest.fn(),
}));
jest.mock('~/server/services/Automations/runner', () => ({
  executeRun: jest.fn(),
}));

const { validateSchedule, ScheduleValidationError } = require('@librechat/api');
const repo = require('~/server/services/Automations/repository');
const { executeRun } = require('~/server/services/Automations/runner');
const ctrl = require('~/server/controllers/automations');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.headersSent = false;
  return res;
}

const user = { id: 'u1', tenantId: 't1' };

describe('automations controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create: blocks a flow with a human_approval node (422)', async () => {
    repo.getFlow.mockResolvedValue({
      _id: 'f1',
      name: 'F',
      nodes: [{ type: 'human_approval' }],
    });
    const req = { user, body: { name: 'A', flowId: 'f1', cron: '0 9 * * 1' } };
    const res = mockRes();
    await ctrl.createAutomation(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'approvalNodeIncompatible' });
  });

  it('create: enforces the active tenant ceiling (422)', async () => {
    repo.getFlow.mockResolvedValue({ _id: 'f1', name: 'F', nodes: [] });
    repo.countEnabled.mockResolvedValue(20);
    const req = { user, body: { name: 'A', flowId: 'f1', cron: '0 9 * * 1' } };
    const res = mockRes();
    await ctrl.createAutomation(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'automationLimitReached' });
  });

  it('create: rejects an invalid cron with 400 and the structured code', async () => {
    validateSchedule.mockImplementation(() => {
      throw new ScheduleValidationError('cronInvalid');
    });
    const req = { user, body: { name: 'A', flowId: 'f1', cron: 'bad' } };
    const res = mockRes();
    await ctrl.createAutomation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'cronInvalid' });
  });

  it('get: returns 404 for another tenant', async () => {
    repo.getAutomation.mockResolvedValue(null);
    const req = { user, params: { id: 'x' } };
    const res = mockRes();
    await ctrl.getAutomation(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('runNow: 422 when the automation is disabled', async () => {
    repo.getAutomation.mockResolvedValue({ _id: 'a1', enabled: false });
    const req = { user, params: { id: 'a1' }, body: {} };
    const res = mockRes();
    await ctrl.runNow(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'automationDisabled' });
  });

  it('runNow: 409 when a concurrent run is active', async () => {
    repo.getAutomation.mockResolvedValue({ _id: 'a1', enabled: true, flowId: 'f1' });
    repo.getFlow.mockResolvedValue({ _id: 'f1', name: 'F', nodes: [] });
    executeRun.mockResolvedValue({ skipped: true });
    const req = { user, params: { id: 'a1' }, body: {} };
    const res = mockRes();
    await ctrl.runNow(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'concurrentRunActive' });
  });

  it('runNow: 202 with runId on success', async () => {
    repo.getAutomation.mockResolvedValue({ _id: 'a1', enabled: true, flowId: 'f1' });
    repo.getFlow.mockResolvedValue({ _id: 'f1', name: 'F', nodes: [] });
    executeRun.mockResolvedValue({ runId: 'r9', status: 'success' });
    const req = { user, params: { id: 'a1' }, body: {} };
    const res = mockRes();
    await ctrl.runNow(req, res);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ runId: 'r9' });
  });

  it('toggle: 422 when enabled is not a boolean', async () => {
    const req = { user, params: { id: 'a1' }, body: { enabled: 'yes' } };
    const res = mockRes();
    await ctrl.toggleEnabled(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('list: 400 on an invalid cursor', async () => {
    const req = { user, query: { cursor: 'not-an-objectid' } };
    const res = mockRes();
    await ctrl.listAutomations(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
