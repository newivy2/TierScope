export type RequestPolicy = {until: number; failures: number; blocked: number; status: number; revision: string; serverUntil?: number;
    responseUntil?: number; connectionUntil?: number; connectionFailures?: number};
export type AcquisitionContext = {epoch: number; generation: number; url: string; room?: string; policyRevision?: string; policyStorageRevision?: string|null};
export type ClockName = 'countdownInterval' | 'trackingTimerInterval' | 'healthCheckInterval';
export type AcquisitionState = Record<ClockName, unknown> & {
    scanEpoch: number; initGuard: number; isScanning: boolean; lastAcquisitionAttemptSource: 'API' | 'DOM';
    domHealthStatus: {lastCheck: number; userListTabFound: boolean; consecutiveFailures: number; isHealthy: boolean};
    domFallbackReadyAtByRoom: Map<string, number>; requestPolicyCache: RequestPolicy; requestPolicyUnsaved: boolean;
    scanIntervalSeconds: number; countdownSeconds: number; lastScheduledIntervalSeconds: number; nextScanAt: number;
    connectionOffline: boolean; connectionRecoveryAt: number;
    requestPolicyStorageRevision: string|null;
};
export type PanelPreferences = {
    highMode: 'sh' | 'ath'; panelGeometry: {left: number; top: number; scale: number} | null;
    isDarkMode: boolean; miniMetric: string; collapsedRows: Set<string>; chartWindowMode: string;
    currentScale: number; panelBackgroundPercent: number; isMinimized: boolean; trendComparisonMode: string; autoTrendEscalation: boolean;
};
