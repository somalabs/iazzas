import { Navigate } from 'react-router-dom';
import {
  PromptsView,
  PromptForm,
  CreatePromptForm,
  EmptyPromptPreview,
} from '~/components/Prompts';
import {
  AdminLayout,
  UsersView,
  RolesView,
  GroupsView,
  GrantsView,
  ConfigsView,
  AnalyticsView,
} from '~/components/Admin';
import { AgentStudioView } from '~/components/AgentStudio';
import DashboardRoute from './Layouts/Dashboard';

const dashboardRoutes = {
  path: 'd/*',
  element: <DashboardRoute />,
  children: [
    /*
    {
      element: <FileDashboardView />,
      children: [
        {
          index: true,
          element: <EmptyVectorStorePreview />,
        },
        {
          path: ':vectorStoreId',
          element: <DataTableFilePreview />,
        },
      ],
    },
    {
      path: 'files/*',
      element: <FilesListView />,
      children: [
        {
          index: true,
          element: <EmptyFilePreview />,
        },
        {
          path: ':fileId',
          element: <FilePreview />,
        },
      ],
    },
    {
      path: 'vector-stores/*',
      element: <VectorStoreView />,
      children: [
        {
          index: true,
          element: <EmptyVectorStorePreview />,
        },
        {
          path: ':vectorStoreId',
          element: <VectorStorePreview />,
        },
      ],
    },
    */
    {
      path: 'prompts/*',
      element: <PromptsView />,
      children: [
        {
          index: true,
          element: <EmptyPromptPreview />,
        },
        {
          path: 'new',
          element: <CreatePromptForm />,
        },
        {
          path: ':promptId',
          element: <PromptForm />,
        },
      ],
    },
    {
      path: 'agent-studio',
      element: <AgentStudioView />,
    },
    {
      path: 'admin',
      element: <AdminLayout />,
      children: [
        { index: true, element: <Navigate to="users" replace /> },
        { path: 'users', element: <UsersView /> },
        { path: 'roles', element: <RolesView /> },
        { path: 'roles/:name', element: <RolesView /> },
        { path: 'groups', element: <GroupsView /> },
        { path: 'groups/:id', element: <GroupsView /> },
        { path: 'grants', element: <GrantsView /> },
        { path: 'configs', element: <ConfigsView /> },
        { path: 'analytics', element: <AnalyticsView /> },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/d/files" replace={true} />,
    },
  ],
};

export default dashboardRoutes;
