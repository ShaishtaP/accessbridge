import { useEffect } from 'react';

// Each route sets the browser tab title, which screen readers announce on navigation.
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · AccessBridge` : 'AccessBridge';
  }, [title]);
}
