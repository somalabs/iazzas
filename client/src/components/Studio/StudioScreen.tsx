import { StudioProvider } from './context';
import StudioView from './View';

export default function StudioScreen() {
  return (
    <StudioProvider>
      <StudioView />
    </StudioProvider>
  );
}
