import { useLocation } from "@remix-run/react";

export const useHomepage = (): boolean => {
    const location = useLocation();

    return location["pathname"] == "/";
}