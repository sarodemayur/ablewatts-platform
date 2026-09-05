import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type AppVersion = "venus" | "mercury";

interface AppVersionContextValue {
  version: AppVersion;
  switchVersion: () => void;
}

const AppVersionContext = createContext<AppVersionContextValue | undefined>(undefined);
const STORAGE_KEY = "aw_version";

export function AppVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState<AppVersion>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as AppVersion) || "venus";
    } catch {
      return "venus";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch {
      // ignore (private browsing, etc.)
    }
  }, [version]);

  const switchVersion = useCallback(() => {
    setVersion((v) => (v === "venus" ? "mercury" : "venus"));
  }, []);

  return <AppVersionContext.Provider value={{ version, switchVersion }}>{children}</AppVersionContext.Provider>;
}

export function useAppVersion() {
  const ctx = useContext(AppVersionContext);
  if (!ctx) throw new Error("useAppVersion must be used within AppVersionProvider");
  return ctx;
}
