import type {CalendarEvent} from "./calendar-types";

export const DISCIPLINE_TRACKS=[
  {id:"regular",menuTitle:"Disciplinas Regulares - 1 e 2",label:"Disciplinas regulares",subtitle:"Disciplinas 1 e 2",sourceGroup:"Disciplinas 1 e 2"},
  {id:"portfolio",menuTitle:"Disciplinas Portifólio / Online - 3",label:"Portfólio / Online",subtitle:"Disciplina 3",sourceGroup:"Disciplina 3"},
] as const;

export type DisciplineTrackId=typeof DISCIPLINE_TRACKS[number]["id"];

export function eventsForDisciplineTrack(events:CalendarEvent[],track:DisciplineTrackId){
  const sourceGroup=DISCIPLINE_TRACKS.find(item=>item.id===track)!.sourceGroup;
  return events.filter(event=>event.kind==="period"
    ?track==="regular"
    :(event.group||event.category)===sourceGroup);
}

export function focusForDisciplineTrack(events:CalendarEvent[],track:DisciplineTrackId){
  return track==="regular"
    ?events.find(event=>event.kind==="period")
    :events.find(event=>event.assessmentType&&event.highlight!=="substitute");
}
