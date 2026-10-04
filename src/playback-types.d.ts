import type {History, Series} from './session-types';
export interface PlaybackSnapshot {
    history: History;
    timeline: number[];
    highs: Record<Series | 'roomTotal', number[]>;
    durationMs: number;
    replayDurationMs: number;
}
export interface PlaybackData {
    url: string;
    key: string | null;
    generation: number;
    imported: boolean;
    archive: {room: string; session: object; [key: string]: unknown};
    snapshot: PlaybackSnapshot;
    allTimeState: object;
    positionMs: number;
    samplePosition: number;
    stepIndex: number;
    speed: number;
    lastTickAt: number;
    playing: boolean;
    timer: number | null;
    paintedPosition: number | undefined;
    paintLayout: number | undefined;
}
export type PlaybackView = Readonly<PlaybackData>;
export interface PlaybackRoot {
    playback: PlaybackView | null;
    presentationMode: 'LIVE' | 'PLAYBACK';
    sessionFileLoadGeneration: number;
}
export type PlaybackOptions = Pick<PlaybackData, 'url' | 'key' | 'generation' | 'archive' | 'snapshot' | 'allTimeState'> & {imported?: boolean};
export type PlaybackClock = { start: (tick: () => void) => number; stop: (handle: number) => void };
