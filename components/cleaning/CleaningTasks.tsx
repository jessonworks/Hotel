
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, Clock, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2, LayoutDashboard, MessageSquareText, Loader2, Eye, Check, AlertCircle, CloudUpload, ChevronLeft
} from 'lucide-react';
import { FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

const CleaningTasks: React.FC = () => {
  const { tasks, rooms, updateTask, approveTask, uploadPhoto, currentUser, users } = useStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [auditTaskId, setAuditTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturingFor, setCapturingFor] = useState<{ id: string, category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' } | null>(null);
  
  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId), [tasks, activeTaskId]);
  const auditTask = useMemo(() => tasks.find(t => t.id === auditTaskId), [tasks, auditTaskId]);
  const room = activeTask ? rooms.find(r => r.id === activeTask.roomId) : null;

  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  
  const myTasks = tasks.filter(t => 
    t.assignedTo === currentUser?.id && 
    (t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO)
  );

  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO);

  useEffect(() => {
    let interval: any;
    if (activeTask?.status === CleaningStatus.EM_PROGRESSO && activeTask.startedAt) {
      const startTime = new Date(activeTask.startedAt).getTime();
      const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      update();
      interval = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTask?.id, activeTask?.status, activeTask?.startedAt]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && activeTask && capturingFor) {
      const file = e.target.files[0];
      const categoryId = capturingFor.id;
      const categoryLabel = capturingFor.category;

      try {
        const base64Data = await uploadPhoto(file, ""); // Agora retorna base64 do store.ts
        if (base64Data) {
          const currentPhotos = (activeTask.photos || []) as any[];
          const otherPhotos = currentPhotos.filter((p: any) => p.type !== categoryId);
          const newPhoto = { type: categoryId, url: base64Data, category: categoryLabel };
          
          const updates: any = { photos: [...otherPhotos, newPhoto] };
          if (categoryLabel === 'START') {
            updates.status = CleaningStatus.EM_PROGRESSO;
            updates.startedAt = new Date().toISOString();
          }
          await updateTask(activeTask.id, updates);
        }
      } catch (err) {
        console.error("Erro ao processar foto:", err);
      }
      setCapturingFor(null);
    }
  };

  const handleComplete = async () => {
    if (!activeTask || isProcessing) return;
    setIsProcessing(true);
    try {
      const finalDuration = Math.max(1, Math.floor(elapsed / 60));
      await updateTask(activeTask.id, { 
        status: CleaningStatus.AGUARDANDO_APROVACAO,
        completedAt: new Date().toISOString(),
        durationMinutes: finalDuration,
        fatorMamaeVerified: true
      });
      
      const message = `🚨 *RELATÓRIO HOSPEDAPRO*\nUnidade: ${room?.number}\nEquipe: ${currentUser?.fullName}\nTempo: ${Math.floor(elapsed/60)}m\nStatus: Conferência Pendente ✅`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
      
      setActiveTaskId(null);
      setElapsed(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const allChecksDone = activeTask ? Object.values(activeTask.checklist).every(v => v) : false;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-32 px-2 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" capture="environment" />
      
      {!activeTask ? (
        <div className="space-y-6">
          {isAdminOrManager && pendingAudits.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2"><CheckCircle2 className="text-emerald-600" size={18}/> Auditoria Pendente</h2>
              <div className="grid gap-3">
                {pendingAudits.map(task => (
                  <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">{rooms.find(r => r.id === task.roomId)?.number}</div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{users.find(u => u.id === task.assignedTo)?.fullName}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{task.durationMinutes} min</p>
                      </div>
                    </div>
                    <button onClick={() => setAuditTaskId(task.id)} className="p-3 bg-slate-900 text-white rounded-xl active:scale-95 shadow-lg"><Eye size={16}/></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 px-2">Minhas Unidades</h2>
            {myTasks.length === 0 ? (
              <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                <CheckCircle2 size={40} className="mx-auto mb-2 opacity-20" />
                <p className="font-black text-[10px] uppercase tracking-widest">Nada pendente no momento.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {myTasks.map(task => {
                  const r = rooms.find(rm => rm.id === task.roomId);
                  const isNew = task.status === CleaningStatus.PENDENTE;
                  return (
                    <div key={task.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4 border-l-[12px] border-l-blue-600">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-4xl font-black text-slate-900">{r?.number}</h3>
                          <p className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-1 mt-1"><Clock size={12}/> Prazo: {task.deadline || 'Imediato'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => isNew ? (setCapturingFor({id:'start', category:'START'}), setActiveTaskId(task.id), setTimeout(()=>fileInputRef.current?.click(),100)) : setActiveTaskId(task.id)}
                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 uppercase text-xs tracking-widest shadow-xl"
                      >
                        {isNew ? <><Camera size={18}/> INICIAR AGORA</> : <><Play size={18}/> CONTINUAR CHECKLIST</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-white h-[100dvh] overflow-hidden">
          <div className="bg-slate-900 p-4 pt-10 text-white shrink-0 flex items-center justify-between shadow-2xl">
            <button onClick={() => setActiveTaskId(null)} className="p-2 bg-white/10 rounded-full"><ChevronLeft size={24} /></button>
            <div className="text-center">
              <h2 className="text-xl font-black tracking-tighter">UNIDADE {room?.number}</h2>
              <div className="text-emerald-400 font-black text-xs flex items-center justify-center gap-1 mt-1">
                <Timer size={14} /> {Math.floor(elapsed/60)}:{(elapsed%60).toString().padStart(2,'0')}
              </div>
            </div>
            <button onClick={() => setActiveTaskId(null)} className="p-2 bg-white/10 rounded-full"><X size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-10 bg-slate-50">
            {activeTask.notes && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 shadow-sm">
                <MessageSquareText className="text-amber-600 shrink-0" size={20} />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">{activeTask.notes}</p>
              </div>
            )}

            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1">Checklist Obrigatório</h3>
              <div className="grid gap-3">
                {Object.keys(activeTask.checklist).map(item => (
                  <label key={item} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <input 
                      type="checkbox" 
                      checked={activeTask.checklist[item]} 
                      onChange={() => updateTask(activeTask.id, { checklist: {...activeTask.checklist, [item]: !activeTask.checklist[item]} })}
                      className="w-6 h-6 rounded-lg text-emerald-600 focus:ring-0 border-slate-300"
                    />
                    <span className="font-black text-xs flex-1 leading-tight">{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1">Evidências Fator Mamãe</h3>
              <div className="grid grid-cols-2 gap-3">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const photo = (activeTask.photos as any[])?.find(p => p.type === req.id);
                  return (
                    <button 
                      key={req.id} 
                      onClick={() => { setCapturingFor({id:req.id, category:'MAMAE'}); fileInputRef.current?.click(); }}
                      className="aspect-video bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative active:scale-95 shadow-inner"
                    >
                      {photo ? (
                        <img src={photo.url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-300">
                          <Camera size={24}/>
                          <span className="text-[7px] font-black text-center px-2 uppercase tracking-tight">{req.label}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="shrink-0 p-4 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom,20px)]">
            <button 
              disabled={isProcessing || !allChecksDone}
              onClick={handleComplete}
              className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 shadow-2xl ${allChecksDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'}`}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <>FINALIZAR TAREFA <ArrowRight/></>}
            </button>
          </div>
        </div>
      )}

      {auditTaskId && auditTask && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col h-[100dvh] animate-in slide-in-from-right duration-300 overflow-hidden">
          <div className="bg-slate-900 p-6 pt-12 text-white flex justify-between items-center shrink-0 shadow-xl">
            <div>
              <h2 className="text-2xl font-black tracking-tighter">AUDITORIA {rooms.find(r => r.id === auditTask.roomId)?.number}</h2>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Colaborador: {users.find(u => u.id === auditTask.assignedTo)?.fullName}</p>
            </div>
            <button onClick={() => setAuditTaskId(null)} className="p-2 bg-white/10 rounded-full"><X/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-10 bg-slate-50">
             <section className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">Fotos do Fator Mamãe</h3>
                <div className="grid gap-6">
                   {(auditTask.photos as any[])?.filter(p => p.category === 'MAMAE' || p.category === 'START').map((p: any, i: number) => (
                     <div key={i} className="space-y-2 bg-white p-2 rounded-2xl shadow-sm">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                          {FATOR_MAMAE_REQUIREMENTS.find(r => r.id === p.type)?.label || 'Foto de Início'}
                        </p>
                        <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border">
                           <img src={p.url} className="w-full h-full object-cover" />
                        </div>
                     </div>
                   ))}
                </div>
             </section>
          </div>
          <div className="shrink-0 p-4 flex gap-3 border-t bg-white pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
             <button onClick={() => approveTask(auditTask.id).then(() => setAuditTaskId(null))} className="flex-1 py-5 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase text-sm tracking-widest active:scale-95 shadow-xl transition-all"><Check/> APROVAR</button>
             <button onClick={() => setAuditTaskId(null)} className="px-6 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px]">VOLTAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
