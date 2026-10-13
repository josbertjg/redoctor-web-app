import { PayPageSkeleton } from '../_components/pay-skeleton';

/** The page's skeleton while it streams (the same one the session guard shows). */
export default function PayLoading() {
  return <PayPageSkeleton />;
}
