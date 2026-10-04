export type Tier = 'red' | 'green' | 'purple' | 'pink' | 'dark-blue' | 'light-blue' | 'gray' | 'female-trans';
export type Series = Tier | 'withTokens' | 'total' | 'anonymous';
export type Counts = Record<Series, number>;
export type High = { value: number; time: number | null };
export type History = Record<Series, number[]> & { timestamps: number[]; breaks?: boolean[] };
export type User = { username: string; tier: Tier | null; gender: string; isOwner?: boolean };
export type ApiCounts = { anonymousCount: number; registeredCount: number; totalUsers: number; ownerCount: number };
export type Acquisition = { source: string; timestamp: number; api: ApiCounts | null };
export type Frame = { roomTotalHigh: number; isRestored?: boolean; playbackNewHighTiers?: Partial<Record<Series, boolean>>; [key: string]: unknown };
export interface LiveSessionState {
    users: Map<string, User>; roomTotal: number; previousUserCount: number; previousRoomTotal: number;
    previousCounts: Counts; hasTrendBaseline: boolean; lastAcceptedAcquisition: Acquisition | null;
    restoredDisplayFrame: Frame | null; history: History; pendingHistoryGap: boolean;
    roomTotalHigh: number; roomTotalHighTime: number | null; tierHighTimes: Partial<Record<Tier, number | null>>;
    withTokensHighTime: number | null; totalHighTime: number | null; anonHighTime: number | null; femaleTransHighTime: number | null;
    sessionStartedAt: number | null; sessionStartEstimated: boolean; sessionHighs: Partial<Record<Series, High>>;
    newHighTiers: Partial<Record<Series, boolean>>; trackingStartTime: number | null; isPaused: boolean; isStopped: boolean;
    stoppedAt: number | null; stopReason: 'manual' | 'absence' | null; broadcasterAbsence: {since: number | null; missing: number};
    absencePausedAt: number | null; absenceOverrideActive: boolean; pausedElapsedTime: number; isAutoRefreshOn: boolean;
}
export type Bootstrap = LiveSessionState & { STORAGE_HISTORY_SERIES: Series[]; TIERS: Record<Tier, unknown>; MAX_HISTORY_LENGTH: number };
export type Snapshot = { source: string; timestamp: number; roomTotal: number; users: User[]; anonymousCount?: number; registeredCount?: number; totalUsers?: number;
    diagnostics?: { unknownClasses: Record<string, number>; unknownGenders: Record<string, number> }; observedAt?: number };
export type SamplePolicy = { breaks: boolean[]; intervalSeconds: number; lastIntervalSeconds: number; timeoutMs: number };
export type SampleReceipt = { before: LiveSessionState; revision: number; counts: Counts | null; diagnostics: Record<string, unknown> | null };
