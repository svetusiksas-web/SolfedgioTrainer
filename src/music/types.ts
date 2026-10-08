export const PPQ=480;
export interface PlaybackEvent{voiceId:number;pitch:string;midiNote:number;startTick:number;durationTicks:number;velocity:number;measureNumber:number}
export interface MeasureInfo{number:number;startTick:number;durationTicks:number}
export interface ScoreData{xml:string;title:string;originalBpm:number;beats:number;beatType:number;events:PlaybackEvent[];measures:MeasureInfo[];partCount:number;durationTicks:number}
export type PlaybackStatus='stopped'|'counting'|'playing'|'paused';
