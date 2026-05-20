import { Tools } from 'librechat-data-provider';
import { useVerifyAgentToolAuth } from '~/data-provider';
import Action from './Action';

export default function CodeForm() {
  const { data } = useVerifyAgentToolAuth({ toolId: Tools.execute_code });

  return (
    <div className="w-full">
      <Action authType={data?.message} isToolAuthenticated={data?.authenticated} />
    </div>
  );
}
