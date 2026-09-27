// Parked experiment: excluded from ALL production/preview builds, even if an
// environment variable is accidentally set. Local Vite development only.
export const STUDIO_ASSISTANT_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_STUDIO_ASSISTANT === '1';
