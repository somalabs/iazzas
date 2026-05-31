import reactRouter from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { getByTestId, queryByTestId, render, waitFor } from 'test/layout-test-utils';
import type { TStartupConfig } from 'librechat-data-provider';
import * as endpointQueries from '~/data-provider/Endpoints/queries';
import * as miscDataProvider from '~/data-provider/Misc/queries';
import * as authMutations from '~/data-provider/Auth/mutations';
import * as authQueries from '~/data-provider/Auth/queries';
import AuthLayout from '~/components/Auth/AuthLayout';
import Login from '~/components/Auth/Login';

jest.mock('librechat-data-provider/react-query');

const mockStartupConfig = {
  isFetching: false,
  isLoading: false,
  isError: false,
  data: {
    socialLogins: ['google', 'facebook', 'openid', 'github', 'discord', 'saml'],
    discordLoginEnabled: true,
    facebookLoginEnabled: true,
    githubLoginEnabled: true,
    googleLoginEnabled: true,
    openidLoginEnabled: true,
    openidLabel: 'Test OpenID',
    openidImageUrl: 'http://test-server.com',
    samlLoginEnabled: true,
    samlLabel: 'Test SAML',
    samlImageUrl: 'http://test-server.com',
    ldap: {
      enabled: false,
    },
    registrationEnabled: true,
    emailLoginEnabled: true,
    socialLoginEnabled: true,
    serverDomain: 'mock-server',
  },
};

const setup = ({
  useGetUserQueryReturnValue = {
    isLoading: false,
    isError: false,
    data: {},
  },
  useLoginUserReturnValue = {
    isLoading: false,
    isError: false,
    mutate: jest.fn(),
    data: {},
    isSuccess: false,
  },
  useRefreshTokenMutationReturnValue = {
    isLoading: false,
    isError: false,
    mutate: jest.fn(),
    data: {
      token: 'mock-token',
      user: {},
    },
  },
  useGetStartupConfigReturnValue = mockStartupConfig,
  useGetBannerQueryReturnValue = {
    isLoading: false,
    isError: false,
    data: {},
  },
} = {}) => {
  const mockUseLoginUser = jest
    .spyOn(authMutations, 'useLoginUserMutation')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useLoginUserReturnValue);
  const mockUseGetUserQuery = jest
    .spyOn(authQueries, 'useGetUserQuery')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useGetUserQueryReturnValue);
  const mockUseGetStartupConfig = jest
    .spyOn(endpointQueries, 'useGetStartupConfig')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useGetStartupConfigReturnValue);
  const mockUseRefreshTokenMutation = jest
    .spyOn(authMutations, 'useRefreshTokenMutation')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useRefreshTokenMutationReturnValue);
  const mockUseGetBannerQuery = jest
    .spyOn(miscDataProvider, 'useGetBannerQuery')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useGetBannerQueryReturnValue);
  const mockUseOutletContext = jest.spyOn(reactRouter, 'useOutletContext').mockReturnValue({
    startupConfig: useGetStartupConfigReturnValue.data,
  });
  const renderResult = render(
    <AuthLayout
      startupConfig={useGetStartupConfigReturnValue.data as TStartupConfig}
      isFetching={useGetStartupConfigReturnValue.isFetching}
      error={null}
      startupConfigError={null}
      header={'Welcome back'}
      pathname="login"
    >
      <Login />
    </AuthLayout>,
  );
  return {
    ...renderResult,
    mockUseLoginUser,
    mockUseGetUserQuery,
    mockUseOutletContext,
    mockUseGetStartupConfig,
    mockUseRefreshTokenMutation,
    mockUseGetBannerQuery,
  };
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useOutletContext: () => ({
    startupConfig: mockStartupConfig,
  }),
}));

// SSO-first login (redesign P2-C): single set of provider buttons with the
// OpenID/Microsoft provider as the primary action; email/password collapse
// behind the "or use email" disclosure. Asserted via stable data-testids so
// the test is locale-independent (the app renders in pt-BR).
test('renders SSO-first with a single set of providers and collapsed email form', () => {
  setup();

  expect(getByTestId(document.body, 'openid')).toHaveAttribute(
    'href',
    'mock-server/oauth/openid',
  );
  expect(getByTestId(document.body, 'google')).toHaveAttribute(
    'href',
    'mock-server/oauth/google',
  );
  expect(getByTestId(document.body, 'facebook')).toHaveAttribute(
    'href',
    'mock-server/oauth/facebook',
  );
  expect(getByTestId(document.body, 'github')).toHaveAttribute(
    'href',
    'mock-server/oauth/github',
  );
  expect(getByTestId(document.body, 'discord')).toHaveAttribute(
    'href',
    'mock-server/oauth/discord',
  );
  expect(getByTestId(document.body, 'saml')).toHaveAttribute('href', 'mock-server/oauth/saml');

  // Email/password are not rendered until the disclosure is opened.
  expect(getByTestId(document.body, 'show-email-form')).toHaveAttribute('aria-expanded', 'false');
  expect(queryByTestId(document.body, 'login-button')).not.toBeInTheDocument();
  expect(document.querySelector('#email')).toBeNull();
  expect(document.querySelector('#password')).toBeNull();
});

test('disclosure reveals the email/password form', async () => {
  setup();

  const toggle = getByTestId(document.body, 'show-email-form');
  expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await userEvent.click(toggle);

  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(document.querySelector('#email')).toBeInTheDocument();
  expect(document.querySelector('#password')).toBeInTheDocument();
  expect(getByTestId(document.body, 'login-button')).toBeInTheDocument();
});

test('calls loginUser.mutate after revealing and submitting the form', async () => {
  const mutate = jest.fn();
  setup({
    // @ts-ignore - we don't need all parameters of the QueryObserverResult
    useLoginUserReturnValue: {
      isLoading: false,
      mutate,
      isError: false,
    },
  });

  await userEvent.click(getByTestId(document.body, 'show-email-form'));

  const emailInput = document.querySelector('#email') as HTMLInputElement;
  const passwordInput = document.querySelector('#password') as HTMLInputElement;
  const submitButton = getByTestId(document.body, 'login-button');

  await userEvent.type(emailInput, 'test@test.com');
  await userEvent.type(passwordInput, 'password');
  await userEvent.click(submitButton);

  await waitFor(() => expect(mutate).toHaveBeenCalled());
});
