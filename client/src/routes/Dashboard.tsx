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
  FeedbacksView,
} from '~/components/Admin';
import StudioScreen from '~/components/Studio/StudioScreen';
import { AgentStudioView, FlowsHome } from '~/components/AgentStudio';
import { AgentesHome, AgentesView } from '~/components/Agentes';
import { AutomacoesScreen } from '~/components/Automacoes';
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
      path: 'studio',
      element: <StudioScreen />,
    },
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
      path: 'flows',
      element: <FlowsHome />,
    },
    {
      path: 'flows/novo',
      element: <AgentStudioView />,
    },
    {
      path: 'flows/:flowId',
      element: <AgentStudioView />,
    },
    {
      path: 'agentes',
      element: <AgentesHome />,
    },
    {
      path: 'agentes/novo',
      element: <AgentesView />,
    },
    {
      path: 'agentes/:agentId',
      element: <AgentesView />,
    },
    {
      path: 'agent-studio',
      element: <Navigate to="/d/flows" replace={true} />,
    },
    {
      path: 'automacoes',
      element: <AutomacoesScreen />,
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
        { path: 'feedbacks', element: <FeedbacksView /> },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/d/studio" replace={true} />,
    },
  ],
};

export default dashboardRoutes;
