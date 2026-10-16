import type {DisciplineTrackId} from "@/lib/discipline-tracks";

export function DisciplineSymbol({track}:{track:DisciplineTrackId}){
  return <svg className="discipline-symbol" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {track==="regular"?<>
      <path d="M16 9C12.4 6.5 8.5 5.9 4 7v17c4.5-1.1 8.4-.5 12 2 3.6-2.5 7.5-3.1 12-2V7c-4.5-1.1-8.4-.5-12 2Z" fill="currentColor" fillOpacity=".06"/>
      <path d="M16 9v17M8 12.5c1.5 0 2.7.3 4 1M8 17c1.5 0 2.7.3 4 1M20 18c1.3-.6 2.6-.9 4-.9"/>
      <path d="M21 6.7V13l2-1.2 2 1.2V6.5"/>
    </>:<>
      <rect x="3" y="5" width="24" height="17" rx="2.5" fill="currentColor" fillOpacity=".06"/>
      <path d="M11 22v4M8 26h9M7 10h7M7 14h4"/>
      <path d="M19.5 12H25l4 4v10.5A1.5 1.5 0 0 1 27.5 28h-8a1.5 1.5 0 0 1-1.5-1.5v-13a1.5 1.5 0 0 1 1.5-1.5Z" fill="var(--discipline-icon-surface)"/>
      <path d="M25 12v4h4M21.5 20h4M21.5 23.5h4"/>
    </>}
  </svg>;
}
