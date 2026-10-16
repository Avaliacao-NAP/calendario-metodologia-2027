import type {CalendarEvent} from "./calendar-types";

export const DISCIPLINE_GROUPS=[
  {id:"regular",menuTitle:"Disciplinas Regulares - 1 e 2",label:"Disciplinas regulares",subtitle:"Disciplinas 1 e 2",sourceGroup:"Disciplinas 1 e 2"},
  {id:"portfolio",menuTitle:"Disciplinas Portifólio / Online - 3",label:"Portfólio / Online",subtitle:"Disciplina 3",sourceGroup:"Disciplina 3"},
] as const;

export type DisciplineGroupId=typeof DISCIPLINE_GROUPS[number]["id"];
export type DisciplineTrackId=DisciplineGroupId|"all"|"none";

export function toggleDisciplineTrack(current:DisciplineTrackId,group:DisciplineGroupId):DisciplineTrackId{
  if(current==="none")return group;
  if(current==="all")return group==="regular"?"portfolio":"regular";
  return current===group?"none":"all";
}

export function eventsForDisciplineTrack(events:CalendarEvent[],track:DisciplineTrackId){
  if(track==="all")return events;
  if(track==="none")return [];
  const sourceGroup=DISCIPLINE_GROUPS.find(item=>item.id===track)!.sourceGroup;
  return events.filter(event=>event.kind==="period"
    ?track==="regular"
    :(event.group||event.category)===sourceGroup);
}

export function focusForDisciplineTrack(events:CalendarEvent[],track:DisciplineTrackId){
  if(track==="none")return undefined;
  return track!=="portfolio"
    ?events.find(event=>event.kind==="period")
    :events.find(event=>event.assessmentType&&event.highlight!=="substitute");
}
