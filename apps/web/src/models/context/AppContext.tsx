import { VersionEnum } from "@gekichumai/dxdata";
import {
  FC,
  PropsWithChildren,
  createContext,
  useEffect,
  useMemo,
} from "react";
import { useLocalStorage } from "react-use";
import { DXRatingPlugin } from "../../utils/capacitor/plugin/wrap";

export type AppContext = AppContextStates & AppContextFns;

export type DXVersion = "festival-plus" | "buddies" | "buddies-plus";

export const DXVersionToDXDataVersionEnumMap: Record<DXVersion, VersionEnum> = {
  "festival-plus": VersionEnum.FESTiVALPLUS,
  buddies: VersionEnum.BUDDiES,
  "buddies-plus": VersionEnum.BUDDiESPLUS,
};

export interface AppContextStates {
  version: DXVersion;
}

export interface AppContextFns {
  setVersion: (version: DXVersion) => void;
}

export const AppContext = createContext<AppContext>({
  version: "festival-plus",
  setVersion: () => {
    throw new Error("AppContext not initialized");
  },
});

export const AppContextProvider: FC<PropsWithChildren<object>> = ({
  children,
}) => {
  const [state, setState] = useLocalStorage<AppContextStates>("app-context", {
    version: "festival-plus",
  });

  const value = useMemo<AppContext>(
    () => ({
      version: state!.version,
      setVersion: (version) => setState({ ...state, version }),
    }),
    [state, setState],
  );

  useEffect(() => {
    console.info("AppContextProvider: userPreferenceDidChanged", value.version);
    DXRatingPlugin.userPreferenceDidChanged({
      version: value.version,
    });
  }, [value.version]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
