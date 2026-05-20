import React, { useState, useMemo } from 'react';
import { ControlCombobox } from '@librechat/client';
import { Controller, useWatch, useFormContext } from 'react-hook-form';
import { useGetModelsQuery } from 'librechat-data-provider/react-query';
import {
  alternateName,
  EModelEndpoint,
  AgentCapabilities,
  isAssistantsEndpoint,
} from 'librechat-data-provider';
import type { AgentForm, StringOption } from '~/common';
import {
  removeFocusOutlines,
  processAgentOption,
  createProviderOption,
  defaultTextProps,
  validateEmail,
  cn,
} from '~/utils';
import { MCPToolSelectDialog } from '~/components/Tools';
import useAgentCapabilities from '~/hooks/Agents/useAgentCapabilities';
import { useFileMapContext, useAgentPanelContext } from '~/Providers';
import AgentCategorySelector from './AgentCategorySelector';
import { useLocalize, useVisibleTools } from '~/hooks';
import { useGetAgentFiles } from '~/data-provider';
import MaxAgentSteps from './Advanced/MaxAgentSteps';
import AgentChain from './Advanced/AgentChain';
import AdvancedSection from './AdvancedSection';
import Instructions from './Instructions';
import FileContext from './FileContext';
import SearchForm from './Search/Form';
import FileSearch from './FileSearch';
import Artifacts from './Artifacts';
import CodeForm from './Code/Form';
import MCPTools from './MCPTools';

const labelClass = 'mb-2 text-token-text-primary block text-sm font-medium';
const inputClass = cn(
  defaultTextProps,
  'flex w-full px-3 py-2 border-border-light bg-surface-secondary focus-visible:ring-2 focus-visible:ring-ring-primary',
  removeFocusOutlines,
);

export default function AgentConfig() {
  const localize = useLocalize();
  const fileMap = useFileMapContext();
  const methods = useFormContext<AgentForm>();
  const [showMCPToolDialog, setShowMCPToolDialog] = useState(false);
  const {
    agentsConfig,
    availableMCPServers,
    mcpServersMap,
    endpointsConfig,
  } = useAgentPanelContext();

  const {
    control,
    setValue,
    formState: { errors },
  } = methods;
  const provider = useWatch({ control, name: 'provider' });
  const agent = useWatch({ control, name: 'agent' });
  const tools = useWatch({ control, name: 'tools' });
  const agent_id = useWatch({ control, name: 'id' });

  const modelsQuery = useGetModelsQuery({ refetchOnMount: 'always' });
  const modelsData = useMemo(() => modelsQuery.data ?? {}, [modelsQuery.data]);

  const allowedProviders = useMemo(
    () => new Set(agentsConfig?.allowedProviders),
    [agentsConfig?.allowedProviders],
  );

  const providers = useMemo(
    () =>
      Object.keys(endpointsConfig ?? {})
        .filter(
          (key) =>
            !isAssistantsEndpoint(key) &&
            (allowedProviders.size > 0 ? allowedProviders.has(key) : true) &&
            key !== EModelEndpoint.agents,
        )
        .map((p) => createProviderOption(p)),
    [endpointsConfig, allowedProviders],
  );

  const providerValue = typeof provider === 'string' ? provider : (provider as StringOption)?.value;
  const availableModels = useMemo(
    () => (providerValue ? (modelsData[providerValue] ?? []) : []),
    [modelsData, providerValue],
  );

  const { data: agentFiles = [] } = useGetAgentFiles(agent_id);

  const mergedFileMap = useMemo(() => {
    const newFileMap = { ...fileMap };
    agentFiles.forEach((file) => {
      if (file.file_id) {
        newFileMap[file.file_id] = file;
      }
    });
    return newFileMap;
  }, [fileMap, agentFiles]);

  const {
    codeEnabled,
    contextEnabled,
    artifactsEnabled,
    webSearchEnabled,
    fileSearchEnabled,
  } = useAgentCapabilities(agentsConfig?.capabilities);

  const chainEnabled = useMemo(
    () => agentsConfig?.capabilities.includes(AgentCapabilities.chain) ?? false,
    [agentsConfig],
  );

  const context_files = useMemo(() => {
    if (typeof agent === 'string') {
      return [];
    }

    if (agent?.id !== agent_id) {
      return [];
    }

    if (agent.context_files) {
      return agent.context_files;
    }

    const _agent = processAgentOption({
      agent,
      fileMap: mergedFileMap,
    });
    return _agent.context_files ?? [];
  }, [agent, agent_id, mergedFileMap]);

  const knowledge_files = useMemo(() => {
    if (typeof agent === 'string') {
      return [];
    }

    if (agent?.id !== agent_id) {
      return [];
    }

    if (agent.knowledge_files) {
      return agent.knowledge_files;
    }

    const _agent = processAgentOption({
      agent,
      fileMap: mergedFileMap,
    });
    return _agent.knowledge_files ?? [];
  }, [agent, agent_id, mergedFileMap]);

  const { mcpServerNames } = useVisibleTools(tools, undefined, mcpServersMap);

  return (
    <>
      <div className="h-auto pt-1">
        {/* Name */}
        <div className="mb-4">
          <label className={labelClass} htmlFor="name">
            {localize('com_ui_name')}
            <span className="text-red-500">*</span>
          </label>
          <Controller
            name="name"
            rules={{ required: localize('com_ui_agent_name_is_required') }}
            control={control}
            render={({ field }) => (
              <>
                <input
                  {...field}
                  value={field.value ?? ''}
                  maxLength={256}
                  className={inputClass}
                  id="name"
                  type="text"
                  placeholder={localize('com_agents_name_placeholder')}
                  aria-label={localize('com_ui_name')}
                />
                <div
                  className={cn(
                    'mt-1 w-56 text-sm text-red-500',
                    errors.name ? 'visible h-auto' : 'invisible h-0',
                  )}
                  role="alert"
                >
                  {errors.name ? errors.name.message : ' '}
                </div>
              </>
            )}
          />
        </div>
        {/* Instructions */}
        <Instructions />
        {/* Category */}
        <div className="mb-4">
          <label className={labelClass} htmlFor="category-selector">
            {localize('com_ui_category')} <span className="text-red-500">*</span>
          </label>
          <AgentCategorySelector className="w-full" />
        </div>
        {(codeEnabled ||
          fileSearchEnabled ||
          artifactsEnabled ||
          contextEnabled ||
          webSearchEnabled) && (
          <div className="mb-4 flex w-full flex-col items-start gap-3">
            <label className="text-token-text-primary block text-sm font-medium">
              {localize('com_ui_ux_agent_capacidades')}
            </label>
            {codeEnabled && <CodeForm />}
            {webSearchEnabled && <SearchForm />}
            {contextEnabled && <FileContext agent_id={agent_id} files={context_files} />}
            {artifactsEnabled && <Artifacts />}
            {fileSearchEnabled && <FileSearch agent_id={agent_id} files={knowledge_files} />}
          </div>
        )}
        <AdvancedSection label={localize('com_ui_ux_agent_avancado')}>
          {/* Agent ID */}
          <div className="mb-4">
            <Controller
              name="id"
              control={control}
              render={({ field }) => (
                <p className="h-3 text-xs italic text-text-secondary" aria-live="polite">
                  {field.value}
                </p>
              )}
            />
          </div>
          {/* Provider */}
          <div className="mb-4">
            <label className={labelClass} htmlFor="provider">
              {localize('com_ui_provider')} <span className="text-red-500">*</span>
            </label>
            <Controller
              name="provider"
              control={control}
              render={({ field }) => {
                const value =
                  typeof field.value === 'string'
                    ? field.value
                    : ((field.value as StringOption)?.value ?? '');
                const display =
                  typeof field.value === 'string'
                    ? field.value
                    : ((field.value as StringOption)?.label ?? '');
                return (
                  <ControlCombobox
                    selectedValue={value}
                    displayValue={alternateName[display] ?? display}
                    selectPlaceholder={localize('com_ui_select_provider')}
                    searchPlaceholder={localize('com_ui_select_search_provider')}
                    setValue={(v) => {
                      field.onChange(createProviderOption(v));
                      setValue('model', '');
                    }}
                    items={providers.map((p) => ({
                      label: typeof p === 'string' ? p : p.label,
                      value: typeof p === 'string' ? p : p.value,
                    }))}
                    ariaLabel={localize('com_ui_provider')}
                    isCollapsed={false}
                    showCarat={true}
                  />
                );
              }}
            />
          </div>
          {/* Model */}
          <div className="mb-4">
            <label className={labelClass} htmlFor="model">
              {localize('com_ui_model')} <span className="text-red-500">*</span>
            </label>
            <Controller
              name="model"
              control={control}
              render={({ field }) => (
                <ControlCombobox
                  selectedValue={field.value ?? ''}
                  selectPlaceholder={
                    providerValue
                      ? localize('com_ui_select_model')
                      : localize('com_ui_select_provider_first')
                  }
                  searchPlaceholder={localize('com_ui_select_model')}
                  setValue={field.onChange}
                  items={availableModels.map((m) => ({ label: m, value: m }))}
                  disabled={!providerValue}
                  className={cn('disabled:opacity-50')}
                  ariaLabel={localize('com_ui_model')}
                  isCollapsed={false}
                  showCarat={true}
                />
              )}
            />
          </div>
          {/* MCP Section */}
          {availableMCPServers != null && availableMCPServers.length > 0 && (
            <MCPTools
              agentId={agent_id}
              mcpServerNames={mcpServerNames}
              setShowMCPToolDialog={setShowMCPToolDialog}
            />
          )}
          {/* Advanced: steps, handoffs, chain */}
          <div className="mb-4">
            <MaxAgentSteps />
          </div>
          {chainEnabled && (
            <div className="mb-4">
              <Controller
                name="agent_ids"
                control={control}
                defaultValue={[]}
                render={({ field }) => <AgentChain field={field} currentAgentId={agent_id} />}
              />
            </div>
          )}
          {/* Support Contact */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span>
                <label className="text-token-text-primary block text-sm font-medium">
                  {localize('com_ui_support_contact')}
                </label>
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label
                  className="mb-1 flex items-center justify-between"
                  htmlFor="support-contact-name"
                >
                  <span className="text-sm">{localize('com_ui_support_contact_name')}</span>
                </label>
                <Controller
                  name="support_contact.name"
                  control={control}
                  rules={{
                    minLength: {
                      value: 3,
                      message: localize('com_ui_support_contact_name_min_length', { minLength: 3 }),
                    },
                  }}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <input
                        {...field}
                        value={field.value ?? ''}
                        className={cn(inputClass, error ? 'border-2 border-red-500' : '')}
                        id="support-contact-name"
                        type="text"
                        placeholder={localize('com_ui_support_contact_name_placeholder')}
                        aria-label={localize('com_ui_support_contact_name')}
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={error ? 'support-contact-name-error' : undefined}
                      />
                      {error && (
                        <span
                          id="support-contact-name-error"
                          className="text-sm text-red-500 transition duration-300 ease-in-out"
                          role="alert"
                          aria-live="polite"
                        >
                          {error.message}
                        </span>
                      )}
                    </>
                  )}
                />
              </div>
              <div className="flex flex-col">
                <label
                  className="mb-1 flex items-center justify-between"
                  htmlFor="support-contact-email"
                >
                  <span className="text-sm">{localize('com_ui_support_contact_email')}</span>
                </label>
                <Controller
                  name="support_contact.email"
                  control={control}
                  rules={{
                    validate: (value) =>
                      validateEmail(value ?? '', localize('com_ui_support_contact_email_invalid')),
                  }}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <input
                        {...field}
                        value={field.value ?? ''}
                        className={cn(inputClass, error ? 'border-2 border-red-500' : '')}
                        id="support-contact-email"
                        type="email"
                        placeholder={localize('com_ui_support_contact_email_placeholder')}
                        aria-label={localize('com_ui_support_contact_email')}
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={error ? 'support-contact-email-error' : undefined}
                      />
                      {error && (
                        <span
                          id="support-contact-email-error"
                          className="text-sm text-red-500 transition duration-300 ease-in-out"
                          role="alert"
                          aria-live="polite"
                        >
                          {error.message}
                        </span>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </div>
        </AdvancedSection>
      </div>
      {availableMCPServers != null && availableMCPServers.length > 0 && (
        <MCPToolSelectDialog
          agentId={agent_id}
          isOpen={showMCPToolDialog}
          mcpServerNames={mcpServerNames}
          setIsOpen={setShowMCPToolDialog}
          endpoint={EModelEndpoint.agents}
        />
      )}
    </>
  );
}
