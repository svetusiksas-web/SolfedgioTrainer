import JSZip from 'jszip';
import{PPQ,type MeasureInfo,type PlaybackEvent,type ScoreData}from'./types';
const semis:Record<string,number>={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const text=(parent:Element,selector:string)=>parent.querySelector(selector)?.textContent?.trim()||undefined;
function pitch(note:Element){const p=note.querySelector(':scope > pitch');if(!p)return null;const step=text(p,'step')??'C',octave=Number(text(p,'octave')??4),alter=Number(text(p,'alter')??0);return{midi:(octave+1)*12+semis[step]+alter,name:`${step}${alter===2?'##':alter===1?'#':alter===-1?'b':alter===-2?'bb':''}${octave}`}}
async function read(file:File){if(!file.name.toLowerCase().endsWith('.mxl'))return file.text();const zip=await JSZip.loadAsync(await file.arrayBuffer()),container=zip.file('META-INF/container.xml');let path:string|undefined;if(container){const doc=new DOMParser().parseFromString(await container.async('text'),'application/xml');path=doc.querySelector('rootfile')?.getAttribute('full-path')??undefined}const score=path?zip.file(path):Object.values(zip.files).find(e=>!e.dir&&/\.(musicxml|xml)$/i.test(e.name));if(!score)throw Error('MXL');return score.async('text')}
export async function parseMusicXML(file:File):Promise<ScoreData>{
 const xml=await read(file),doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror')||!doc.querySelector('score-partwise'))throw Error('XML');
 const title=text(doc.documentElement,'work > work-title')??text(doc.documentElement,'movement-title')??file.name.replace(/\.(musicxml|xml|mxl)$/i,'');
 const all=Array.from(doc.querySelectorAll('score-partwise > part'));if(!all.length)throw Error('PARTS');
 const staffNumbers=new Set(Array.from(all[0].querySelectorAll('note > staff')).map(node=>Number(node.textContent?.trim()||1)));
 const usesTwoStaves=all.length===1&&staffNumbers.size>=2,parts=all.slice(0,2),detectedVoiceCount=usesTwoStaves?staffNumbers.size:all.length;
 let bpm=Number(doc.querySelector('sound[tempo]')?.getAttribute('tempo')??text(doc.documentElement,'per-minute')??80),beats=Number(text(doc.documentElement,'time > beats')??4),beatType=Number(text(doc.documentElement,'time > beat-type')??4);if(!Number.isFinite(bpm)||bpm<=0)bpm=80;
 const events:PlaybackEvent[]=[],map=new Map<number,MeasureInfo>();let end=0;
 parts.forEach((part,voiceId)=>{let divisions=1,absolute=0;const ties=new Map<number,PlaybackEvent>();
  Array.from(part.querySelectorAll(':scope > measure')).forEach((measure,index)=>{divisions=Number(text(measure,'attributes > divisions')??divisions)||divisions;if(voiceId===0){beats=Number(text(measure,'attributes > time > beats')??beats);beatType=Number(text(measure,'attributes > time > beat-type')??beatType)}
   const number=Number(measure.getAttribute('number'))||index+1,start=absolute;let cursor=0,last=0,furthest=0;
   Array.from(measure.children).forEach(node=>{const raw=Number(text(node,':scope > duration')??0),duration=Math.max(0,Math.round(raw/divisions*PPQ));if(node.tagName==='backup'){cursor=Math.max(0,cursor-duration);return}if(node.tagName==='forward'){cursor+=duration;furthest=Math.max(furthest,cursor);return}if(node.tagName!=='note')return;const chord=!!node.querySelector(':scope > chord'),at=chord?last:cursor;if(!chord)last=at;const p=pitch(node),eventVoiceId=usesTwoStaves?Math.max(0,Number(text(node,':scope > staff')??1)-1):voiceId;if(p&&eventVoiceId<2&&!node.querySelector(':scope > rest')){const tieStart=!!node.querySelector('tie[type="start"]'),tieStop=!!node.querySelector('tie[type="stop"]'),tieKey=eventVoiceId*128+p.midi,previous=ties.get(tieKey);if(tieStop&&previous){previous.durationTicks=absolute+at+duration-previous.startTick;if(!tieStart)ties.delete(tieKey)}else{const event={voiceId:eventVoiceId,pitch:p.name,midiNote:p.midi,startTick:absolute+at,durationTicks:duration,velocity:.72,measureNumber:number};events.push(event);if(tieStart)ties.set(tieKey,event)}}if(!chord)cursor+=duration;furthest=Math.max(furthest,at+duration,cursor)});
   const nominal=Math.round(beats*PPQ*(4/beatType)),length=Math.max(furthest,nominal);if(!map.has(number))map.set(number,{number,startTick:start,durationTicks:length});absolute+=length
  });end=Math.max(end,absolute)
 });
 return{xml,title,originalBpm:Math.round(bpm),beats,beatType,events,measures:Array.from(map.values()).sort((a,b)=>a.startTick-b.startTick),partCount:detectedVoiceCount,durationTicks:end}
}
