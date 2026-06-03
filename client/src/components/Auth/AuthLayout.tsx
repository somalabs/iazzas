import { ThemeSelector } from '@librechat/client';
import { TStartupConfig } from 'librechat-data-provider';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import { TranslationKeys, useLocalize } from '~/hooks';
import BrandDuotone from '~/components/ui/BrandDuotone';
import SocialLoginRender from './SocialLoginRender';
import { BlinkAnimation } from './BlinkAnimation';
import { Banner } from '../Banners';
import Footer from './Footer';

function AuthLayout({
  children,
  header,
  isFetching,
  startupConfig,
  startupConfigError,
  pathname,
  error,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  isFetching: boolean;
  startupConfig: TStartupConfig | null | undefined;
  startupConfigError: unknown | null | undefined;
  pathname: string;
  error: TranslationKeys | null;
}) {
  const localize = useLocalize();

  const hasStartupConfigError = startupConfigError !== null && startupConfigError !== undefined;
  const DisplayError = () => {
    if (hasStartupConfigError) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize('com_auth_error_login_server')}</ErrorMessage>
        </div>
      );
    } else if (error === 'com_auth_error_invalid_reset_token') {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>
            {localize('com_auth_error_invalid_reset_token')}{' '}
            <a className="font-semibold text-brand-purple hover:underline" href="/forgot-password">
              {localize('com_auth_click_here')}
            </a>{' '}
            {localize('com_auth_to_try_again')}
          </ErrorMessage>
        </div>
      );
    } else if (error != null && error) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize(error)}</ErrorMessage>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-canvas dark:bg-gray-900">
      <BrandDuotone src="/assets/brand/azzas-campaign-1.jpg" imageOpacity={0.09} className="z-0" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Banner />
        <BlinkAnimation active={isFetching}>
          <div className="mt-6 flex h-24 w-full items-center justify-center">
            <img
              src="assets/azzas-logo-dark.svg"
              className="max-h-full max-w-[280px] object-contain invert dark:invert-0"
              alt={localize('com_ui_logo', { 0: startupConfig?.appTitle ?? 'Azzas 2154' })}
            />
          </div>
        </BlinkAnimation>
        <DisplayError />
        <div className="absolute bottom-0 left-0 md:m-4">
          <ThemeSelector />
        </div>

        <main className="flex flex-grow items-center justify-center">
          <div className="w-authPageWidth overflow-hidden rounded-[14px] border border-rule bg-paper px-6 py-4 shadow-atelier dark:border-gray-700 dark:bg-gray-900 sm:max-w-md">
            {!hasStartupConfigError && !isFetching && header && (
              <h1
                className="mb-4 text-center font-editorial text-3xl font-medium tracking-[-0.5px] text-text-primary dark:text-white"
                style={{ userSelect: 'none' }}
              >
                {header}
              </h1>
            )}
            {children}
            {!pathname.includes('2fa') && pathname.includes('register') && (
              <SocialLoginRender startupConfig={startupConfig} />
            )}
          </div>
        </main>
        <Footer startupConfig={startupConfig} />
      </div>
    </div>
  );
}

export default AuthLayout;
