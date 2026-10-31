import { onSnapshot, type Query, type Unsubscribe } from 'firebase/firestore';
import { isDemoMode } from './demo-mode.ts';
import { subscribeDemoCollection, type DemoSnapshot } from './demo-data.ts';

type DemoCollectionName =
  | 'tasks'
  | 'submissions'
  | 'partnerShops'
  | 'pointsLedger'
  | 'transactions'
  | 'shopkeeperApplications'
  | 'users';

export function subscribeCollection(
  name: DemoCollectionName,
  source: Query,
  filters: Record<string, unknown>,
  onData: (snapshot: DemoSnapshot) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (isDemoMode) {
    return subscribeDemoCollection(name, filters, onData);
  }
  return onSnapshot(source, onData, onError);
}
