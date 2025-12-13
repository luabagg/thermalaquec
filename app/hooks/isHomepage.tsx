import { useLocation } from "@remix-run/react";

export const useIsHomepage = (): boolean => {
  const location = useLocation();

  return location["pathname"] == "/";
};
