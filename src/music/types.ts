export const PPQ=480;
export interface PlaybackEvent{voiceId:number;pitch:string;midiNote:number;startTick:number;durationTicks:number;velocity:number;measureNumber:number}
export interface MeasureInfo{number:number;startTick:number;durationTicks:number}
export type VoiceMode=1|2|3|4;
export type VoiceFlags=[boolean,boolean,boolean,boolean];
export type VoiceVolumes=[number,number,number,number];
export interface ScoreData{xml:string;title:string;originalBpm:number;beats:number;beatType:number;events:PlaybackEvent[];measures:MeasureInfo[];partCount:number;durationTicks:number;availableVoices:VoiceFlags}
export type PlaybackStatus='stopped'|'counting'|'playing'|'paused';
