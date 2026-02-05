import { useEffect } from "react";
import { useStore } from "@nanostores/react";

import { $authReady, $user, loadUser } from "../store/authStore";

type UseAuthOptions = {
  enabled?: boolean;
};

export function useAuth(options: UseAuthOptions = {}) {
  const enabled = options.enabled ?? true;
  const user = useStore($user);
  const authReady = useStore($authReady);

  useEffect(() => {
    if (!enabled) return;
    if (!authReady) {
      void loadUser();
    }
  }, [authReady, enabled]);

  return { user, authReady };
}
