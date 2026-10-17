import { createContext, useContext } from 'react';

/**
 * Tells screens that a persistent header (PremiumHeader) already sits above them and has taken the top safe area, so
 * `Screen` must not pad it a second time. Provided by the tab layout.
 */
export const ChromeContext = createContext({ hasHeader: false });

export const useHasHeader = () => useContext(ChromeContext).hasHeader;
