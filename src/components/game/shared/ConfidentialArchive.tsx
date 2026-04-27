import { memo } from 'react';
import { getRoleName } from '../../../constants/roles';
import type { RoleType } from '../../../types/character';

interface ConfidentialArchiveProps {
  isOpen: boolean;
  onToggle: () => void;
  character: RoleType | null;
  fakeCharacter?: RoleType | null;
  alignment: string | null;
  evilTeamInfo?: {
    demonName: string;
    minionNames: string[];
    bluffs: RoleType[];
  } | null;
  messageHistory?: string[];
}

export const ConfidentialArchive = memo(({
  isOpen,
  onToggle,
  character,
  fakeCharacter,
  alignment,
  evilTeamInfo,
  messageHistory
}: ConfidentialArchiveProps) => {
  const currentRoleName = getRoleName(fakeCharacter || character);

  return (
    <div className="bg-slate-900/80 rounded-[2.5rem] border border-slate-800 backdrop-blur shadow-2xl overflow-hidden mt-4 transition-all duration-300">
      <button 
        onClick={onToggle} 
        aria-expanded={isOpen}
        aria-controls="confidential-archive-content"
        className="w-full p-8 flex items-center justify-between hover:bg-slate-800/50 transition-all group focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
      >
        <div className="flex items-center gap-5">
           <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform" aria-hidden="true">🎭</div>
           <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500 block mb-1">비밀 기록관</span>
              <span className="text-lg font-black text-slate-200 tracking-tight uppercase font-serif">정체 및 과거 기록 확인</span>
           </div>
        </div>
        <span 
          className={`text-slate-600 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>

      {isOpen && (
        <div 
          id="confidential-archive-content"
          className="p-8 pt-0 space-y-8 animate-fade-in border-t border-slate-800/50 mt-2 bg-slate-950/40"
        >
           <div className="py-6 px-8 bg-slate-950/80 rounded-[1.5rem] border border-slate-800 shadow-inner mt-6 text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">현재 나의 정체</p>
              <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-100 to-sky-400 uppercase tracking-tighter italic">{currentRoleName}</p>
           </div>

           {alignment === 'evil' && evilTeamInfo && (
              <div className="p-6 bg-rose-950/20 border border-rose-500/20 rounded-[1.5rem] space-y-6 shadow-xl text-center">
                 <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/10 pb-3">비밀 작전 브리핑</p>
                 <div className="grid grid-cols-1 gap-6">
                    <div>
                      <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">악마(Demon)</span>
                      <span className="text-xl text-rose-400 font-black uppercase tracking-tight italic underline decoration-rose-500/20">{evilTeamInfo.demonName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-black uppercase mb-1">하수인(Minions)</span>
                      <span className="text-base text-white font-bold leading-tight uppercase tracking-tight">{evilTeamInfo.minionNames.join(', ')}</span>
                    </div>
                    {evilTeamInfo.bluffs.length > 0 && character === 'imp' && (
                       <div className="pt-4 border-t border-rose-500/10">
                          <span className="block text-[10px] text-slate-500 font-black uppercase mb-3 tracking-widest">악마 블러프</span>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {evilTeamInfo.bluffs.map(b => (
                              <span key={b} className="bg-sky-500/10 text-sky-400 px-4 py-1.5 rounded-xl border border-sky-500/20 text-xs font-black uppercase shadow-sm">
                                {getRoleName(b)}
                              </span>
                            ))}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           )}

           <div className="space-y-4">
              <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1">정보 기록 보관소</p>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                 {messageHistory && messageHistory.length > 0 ? (
                    messageHistory.map((msg, i) => (
                      <div key={i} className="p-5 bg-slate-900/80 rounded-[1.25rem] border border-slate-800 shadow-lg text-base text-slate-300 italic font-serif leading-relaxed relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/20 group-hover:bg-sky-500 transition-colors"></div>
                         <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-black text-sky-500/60 uppercase tracking-[0.2em]">기록 #{i + 1}</span>
                            <span className="text-[8px] font-bold text-slate-700 font-mono text-xs uppercase">밤 {i + 1}</span>
                         </div>
                         <p className="pl-2">"{msg}"</p>
                      </div>
                    ))
                 ) : (
                    <div className="py-12 px-6 text-center border-2 border-dashed border-slate-800 rounded-[2rem] bg-slate-950/20 shadow-inner">
                      <p className="text-slate-700 font-black uppercase tracking-widest text-xs font-serif">복구된 기록이 없습니다.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
});

ConfidentialArchive.displayName = 'ConfidentialArchive';
