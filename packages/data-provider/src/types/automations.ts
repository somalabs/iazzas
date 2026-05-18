import type { FlowRun } from './flow';

export type AutomationStatus = 'running' | 'success' | 'failed' | 'skipped';

export type Automation = {
  _id: string;
  tenantId: string;
  flowId: string;
  flowName?: string;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  triggerInput?: string;
  outputTargets: string[];
  createdBy: string;
  lastRunAt?: string;
  lastStatus?: AutomationStatus;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TAutomationListResponse = {
  automations: Automation[];
  nextCursor: string | null;
};

export type TAutomationResponse = {
  automation: Automation;
};

export type TAutomationCreateRequest = {
  flowId: string;
  name: string;
  cron: string;
  timezone?: string;
  triggerInput?: string;
  enabled?: boolean;
};

export type TAutomationUpdateRequest = Partial<TAutomationCreateRequest>;

export type TAutomationToggleRequest = {
  enabled: boolean;
};

export type TAutomationRunRequest = {
  triggerInput?: string;
};

export type TAutomationRunResponse = {
  runId: string;
};

export type TAutomationRunsResponse = {
  runs: FlowRun[];
  nextCursor: string | null;
};

export type TAutomationDeleteResponse = {
  deleted: boolean;
};
