import { useEffect, useState } from 'react';
import { ErrorTypes, registerPage } from 'librechat-data-provider';
import { OpenIDIcon, useToastContext } from '@librechat/client';
import { useOutletContext, useSearchParams, useLocation } from 'react-router-dom';
import type { TLoginLayoutContext } from '~/common';
import { getLoginError, persistRedirectToSession } from '~/utils';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import SocialLoginRender from '~/components/Auth/SocialLoginRender';
import SocialButton from '~/components/Auth/SocialButton';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';
import LoginForm from './LoginForm';

interface LoginLocationState {
  redirect_to?: string;
}

function Login() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { error, setError, login } = useAuthContext();
  const { startupConfig } = useOutletContext<TLoginLayoutContext>();

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const disableAutoRedirect = searchParams.get('redirect') === 'false';

  const [isAutoRedirectDisabled, setIsAutoRedirectDisabled] = useState(disableAutoRedirect);

  const socialLoginEnabled = startupConfig?.socialLoginEnabled === true;
  const emailLoginEnabled = startupConfig?.emailLoginEnabled === true;
  const [showEmailForm, setShowEmailForm] = useState(!socialLoginEnabled);

  useEffect(() => {
    const redirectTo = searchParams.get('redirect_to');
    if (redirectTo) {
      persistRedirectToSession(redirectTo);
    } else {
      const state = location.state as LoginLocationState | null;
      if (state?.redirect_to) {
        persistRedirectToSession(state.redirect_to);
      }
    }

    const oauthError = searchParams?.get('error');
    if (oauthError && oauthError === ErrorTypes.AUTH_FAILED) {
      showToast({
        message: localize('com_auth_error_oauth_failed'),
        status: 'error',
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, showToast, localize, location.state]);

  useEffect(() => {
    if (disableAutoRedirect) {
      setIsAutoRedirectDisabled(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('redirect');
      setSearchParams(newParams, { replace: true });
    }
  }, [disableAutoRedirect, searchParams, setSearchParams]);

  useEffect(() => {
    if (error != null) {
      setShowEmailForm(true);
    }
  }, [error]);

  const shouldAutoRedirect =
    startupConfig?.openidLoginEnabled &&
    startupConfig?.openidAutoRedirect &&
    startupConfig?.serverDomain &&
    !isAutoRedirectDisabled;

  useEffect(() => {
    if (shouldAutoRedirect) {
      console.log('Auto-redirecting to OpenID provider...');
      window.location.href = `${startupConfig.serverDomain}/oauth/openid`;
    }
  }, [shouldAutoRedirect, startupConfig]);

  if (shouldAutoRedirect) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-lg font-semibold">
          {localize('com_ui_redirecting_to_provider', { 0: startupConfig.openidLabel })}
        </p>
        <div className="mt-4">
          <SocialButton
            key="openid"
            enabled={startupConfig.openidLoginEnabled}
            serverDomain={startupConfig.serverDomain}
            oauthPath="openid"
            variant="primary"
            Icon={() =>
              startupConfig.openidImageUrl ? (
                <img src={startupConfig.openidImageUrl} alt="OpenID Logo" className="h-5 w-5" />
              ) : (
                <OpenIDIcon />
              )
            }
            label={startupConfig.openidLabel || localize('com_auth_microsoft_login')}
            id="openid"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {error != null && <ErrorMessage>{localize(getLoginError(error))}</ErrorMessage>}
      <SocialLoginRender startupConfig={startupConfig} emailDivider={false} />
      {emailLoginEnabled && (
        <>
          {socialLoginEnabled && (
            <button
              type="button"
              data-testid="show-email-form"
              aria-expanded={showEmailForm}
              aria-controls="email-login"
              onClick={() => setShowEmailForm((prev) => !prev)}
              className="mt-6 flex w-full items-center gap-3 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              <span className="h-px flex-1 bg-border-medium" />
              <span>{localize('com_auth_use_email')}</span>
              <span className="h-px flex-1 bg-border-medium" />
            </button>
          )}
          {showEmailForm && (
            <div id="email-login">
              <LoginForm
                onSubmit={login}
                startupConfig={startupConfig}
                error={error}
                setError={setError}
              />
            </div>
          )}
        </>
      )}
      {startupConfig?.registrationEnabled === true && (
        <p className="my-4 text-center text-sm font-light text-gray-700 dark:text-white">
          {' '}
          {localize('com_auth_no_account')}{' '}
          <a
            href={registerPage()}
            className="inline-flex p-1 text-sm font-medium text-brand-purple underline decoration-transparent transition-all duration-200 hover:decoration-brand-purple focus:decoration-brand-purple"
          >
            {localize('com_auth_sign_up')}
          </a>
        </p>
      )}
    </>
  );
}

export default Login;
