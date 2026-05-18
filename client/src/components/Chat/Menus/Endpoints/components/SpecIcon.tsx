import React, { memo } from 'react';
import { Constants, EModelEndpoint, getEndpointField } from 'librechat-data-provider';
import type { TModelSpec, TEndpointsConfig } from 'librechat-data-provider';
import type { IconMapProps } from '~/common';
import { getModelSpecIconURL, getIconKey } from '~/utils';
import { URLIcon } from '~/components/Endpoints/URLIcon';
import { icons } from '~/hooks/Endpoint/Icons';

interface SpecIconProps {
  currentSpec: TModelSpec;
  endpointsConfig: TEndpointsConfig;
}

type IconType = (props: IconMapProps) => React.JSX.Element;

const SpecIcon: React.FC<SpecIconProps> = ({ currentSpec, endpointsConfig }) => {
  const iconURL = getModelSpecIconURL(currentSpec);
  const { endpoint, agent_id, model } = currentSpec.preset;
  const endpointIconURL = getEndpointField(endpointsConfig, endpoint, 'iconURL');
  let iconKey = getIconKey({ endpoint, endpointsConfig, endpointIconURL });

  if (
    endpoint === EModelEndpoint.agents &&
    agent_id === Constants.EPHEMERAL_AGENT_ID &&
    typeof model === 'string' &&
    model.startsWith('gemini-')
  ) {
    iconKey = EModelEndpoint.google;
  }

  let Icon: IconType;

  const isImageUrl = iconURL.includes('http') || iconURL.startsWith('/');

  if (isImageUrl) {
    return (
      <URLIcon
        iconURL={iconURL}
        altName={currentSpec.name}
        containerStyle={{ width: 24, height: 20 }}
        imageStyle={{ width: '100%', height: '100%', objectFit: 'contain' }}
        className="shrink-0 overflow-hidden"
        endpoint={endpoint || undefined}
      />
    );
  }

  Icon = (icons[iconURL] ?? icons[iconKey] ?? icons.unknown) as IconType;

  return (
    <Icon
      size={20}
      endpoint={endpoint}
      context="menu-item"
      iconURL={endpointIconURL}
      className="icon-md shrink-0 text-text-primary"
    />
  );
};

export default memo(SpecIcon);
