import { useState, useCallback } from 'react';
import { Spinner } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useGetAdminAnalyticsQuery } from '~/data-provider';
import KPICards from './KPICards';
import AnalyticsFilters from './Filters';
import TrendChart from './TrendChart';
import ModelChart from './ModelChart';
import TopUsers from './TopUsers';
import type { AdminAnalyticsParams } from 'librechat-data-provider';

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function defaultEndDate(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function AnalyticsView() {
  const localize = useLocalize();

  const [params, setParams] = useState<AdminAnalyticsParams>({
    startDate: defaultStartDate(),
    endDate: defaultEndDate(),
    groupBy: 'day',
  });
  const [userSearch, setUserSearch] = useState('');

  const { data, isLoading, isError } = useGetAdminAnalyticsQuery(params);

  const handleParamsChange = useCallback((next: Partial<AdminAnalyticsParams>) => {
    setParams((prev) => ({ ...prev, ...next }));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-text-primary">
        {localize('com_admin_analytics_title')}
      </h1>

      <AnalyticsFilters
        params={params}
        userSearch={userSearch}
        onUserSearchChange={setUserSearch}
        onChange={handleParamsChange}
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-red-500">{localize('com_admin_analytics_no_data')}</p>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          <KPICards kpis={data.kpis} />
          <TrendChart data={data.timeSeries} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ModelChart data={data.byModel} />
            <TopUsers users={data.topUsers} />
          </div>
        </div>
      )}
    </div>
  );
}
