import {BookOpen,ClipboardList,Globe,GraduationCap,Megaphone,Ban,CalendarDays} from "lucide-react";
import {activityIdentity} from "@/lib/activity-identity";
import type {CalendarEvent} from "@/lib/calendar-types";

const icons={mapa:ClipboardList,study:BookOpen,hub:Globe,exam:GraduationCap,publication:Megaphone,cancel:Ban,period:CalendarDays};

export function ActivitySymbol({event,size=18,className=""}:{event:Pick<CalendarEvent,"title"|"category"|"kind">;size?:number;className?:string}){
  const Icon=icons[activityIdentity(event).icon];
  return <span className={`activity-symbol ${className}`} aria-hidden="true"><Icon size={size} strokeWidth={1.8}/></span>;
}
