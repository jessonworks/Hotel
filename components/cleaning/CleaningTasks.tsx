
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole, RoomStatus } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, Clock, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2, LayoutDashboard, MessageSquareText, Loader2, Eye, Check, AlertCircle
} from 'lucide-react';
import { FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

const CleaningTasks: React.FC = () => {
  const { tasks, rooms, updateTask, approveTask, currentUser, users } = useStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [auditTaskId, setAuditTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturingFor, setCapturingFor] = useState<{ id: string, category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' } | null>(null);

  const [draftPhotos, setDraftPhotos] = useState<Record<string, {url: string, uploading: boolean}>>({});

  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  
  const myTasks = tasks.filter(t => 
    t.assignedTo === currentUser?.id && 
    (t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO)
  );

  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO);

  const teamActivity = tasks.filter(t => {
    return t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO;
  });

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId), [tasks, activeTaskId]);
  const auditTask = useMemo(() => tasks.find(t => t.id === auditTaskId), [tasks, auditTaskId]);
  const room = activeTask ? rooms.find(r => r.id === activeTask.roomId) : null;

  useEffect(() => {
    if (activeTask) {
      const existing: Record<string, {url: string, uploading: boolean}> = {};
      (activeTask.photos as any[])?.forEach((p: any) => {
        if (p && p.type) {
          existing[p.type] = { url: p.url, uploading: false };
        }
      });
      setDraftPhotos(existing);
    } else {
      setDraftPhotos({});
    }
  }, [activeTaskId, activeTask]);

  // TIMER ESTÁVEL: Baseado no tempo de início real para evitar travamentos
  useEffect(() => {
    let interval: any;
    if (activeTask?.status === CleaningStatus.EM_PROGRESSO && activeTask.startedAt) {
      const startTime = new Date(activeTask.startedAt).getTime();
      const update = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - startTime) / 1000));
        setElapsed(diff);
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTask?.id, activeTask?.status, activeTask?.startedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartPhoto = (taskId: string) => {
    setCapturingFor({ id: 'start_audit', category: 'START' });
    setActiveTaskId(taskId);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeTask && capturingFor) {
      const file = e.target.files[0];
      const categoryId = capturingFor.id;
      const categoryLabel = capturingFor.category;

      setDraftPhotos(prev => ({ ...prev, [categoryId]: { ...((prev[categoryId] || {}) as any), uploading: true } }));

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setDraftPhotos(prev => ({ ...prev, [categoryId]: { url: base64, uploading: false } }));

        const currentPhotos = (activeTask.photos || []) as any[];
        const otherPhotos = currentPhotos.filter((p: any) => p.type !== categoryId);
        const newPhoto = { type: categoryId, url: base64, category: categoryLabel };
        
        const updates: any = { photos: [...otherPhotos, newPhoto] };
        if (categoryLabel === 'START') {
          updates.status = CleaningStatus.EM_PROGRESSO;
          updates.startedAt = new Date().toISOString();
        }
        
        await updateTask(activeTask.id, updates);
        setCapturingFor(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleCheck = async (item: string) => {
    if (!activeTask) return;
    const newChecklist = { ...activeTask.checklist, [item]: !activeTask.checklist[item] };
    // Chamada otimista na store
    await updateTask(activeTask.id, { checklist: newChecklist });
  };

  const handleComplete = async () => {
    if (!activeTask) return;
    setIsProcessing(true);
    const finalDuration = Math.max(1, Math.floor(elapsed / 60));
    
    const finalPhotos = Object.entries(draftPhotos).map(([type, data]: [string, any]) => ({
      type,
      url: data.url,
      category: 'MAMAE' as const
    }));

    await updateTask(activeTask.id, { 
      status: CleaningStatus.AGUARDANDO_APROVACAO,
      completedAt: new Date().toISOString(),
      durationMinutes: finalDuration,
      fatorMamaeVerified: true,
      photos: finalPhotos
    });
    
    const message = `🚨 *RELATÓRIO HOSPEDAPRO*\nUnidade: ${room?.number}\nEquipe: ${currentUser?.fullName}\nTempo: ${formatTime(elapsed)}\nStatus: Conferência Pendente ✅`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    
    setActiveTaskId(null);
    setElapsed(0);
    setIsProcessing(false);
  };

  const handleApprove = async (taskId: string) => {
    setIsProcessing(true);
    await approveTask(taskId);
    setAuditTaskId(null);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 pb-32 px-2 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" capture="environment" />
      
      {!activeTask ? (
        <div className="space-y-6 md:space-y-12">
          {isAdminOrManager && (
            <>
              {pendingAudits.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm"><CheckCircle2 size={16} /></div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Aguardando Auditoria</h2>
                  </div>
                  <div className="grid gap-4">
                    {pendingAudits.map(task => {
                      const tr = rooms.find(r => r.id === task.roomId);
                      const staff = users.find(u => u.id === task.assignedTo);
                      return (
                        <div key={task.id} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                                {tr?.number}
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{staff?.fullName || 'Equipe'}</p>
                                <p className="text-xs font-bold text-slate-700">{task.durationMinutes || 1} min faxina</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setAuditTaskId(task.id)}
                              className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                            >
                              <Eye size={14} /> REVISAR
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {teamActivity.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><LayoutDashboard size={16} /></div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Equipe em Campo</h2>
                  </div>
                  <div className="grid gap-2">
                    {teamActivity.map(task => {
                      const tr = rooms.find(r => r.id === task.roomId);
                      const staff = users.find(u => u.id === task.assignedTo);
                      const isWorking = task.status === CleaningStatus.EM_PROGRESSO;
                      return (
                        <div key={task.id} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xs">Q.{tr?.number || '??'}</div>
                            <p className="text-xs font-black text-slate-800">{staff?.fullName || 'Pendente'}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isWorking ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                            {isWorking ? 'Limpando' : 'Escalado'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {!isAdminOrManager && (
            <section className="space-y-6">
              <header className="flex items-center gap-4 px-2">
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl">
                  <ClipboardCheck size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Meu Painel</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Faxinas Designadas</p>
                </div>
              </header>

              {myTasks.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-12 text-center">
                  <CheckCircle2 size={48} className="text-slate-200 mx-auto mb-4" />
                  <h3 className="text-slate-900 font-black text-xl mb-1">Tudo OK!</h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhuma tarefa pendente.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myTasks.map(task => {
                    const tr = rooms.find(r => r.id === task.roomId);
                    const isNew = task.status === CleaningStatus.PENDENTE;
                    return (
                      <div key={task.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col gap-6 shadow-sm border-l-8 border-l-blue-600">
                        <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl ${isNew ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                            <Bed size={32} />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-4xl font-black text-slate-900 leading-none">{tr?.number}</h3>
                            <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest">
                               <Clock size={14} /> PRAZO: {task.deadline || 'AGORA'}
                            </div>
                          </div>
                        </div>
                        {task.notes && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-start gap-2">
                            <MessageSquareText size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold text-amber-900">{task.notes}</p>
                          </div>
                        )}
                        <button 
                          onClick={() => isNew ? handleStartPhoto(task.id) : setActiveTaskId(task.id)}
                          className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 text-sm tracking-widest uppercase"
                        >
                          {isNew ? <><Camera size={20} /> TIRAR FOTO E INICIAR</> : <><Play size={20} /> CONTINUAR CHECKLIST</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="bg-white fixed inset-0 z-[100] flex flex-col animate-in slide-in-from-bottom-10 overscroll-none">
          <div className="bg-slate-900 p-6 pt-10 text-white shrink-0">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-4xl font-black tracking-tighter">UNIDADE {room?.number}</h2>
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xl">
                  <Timer size={20} /> {formatTime(elapsed)}
                </div>
              </div>
              <button onClick={() => setActiveTaskId(null)} className="p-3 bg-white/10 rounded-full">
                <X size={28} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-44 custom-scrollbar overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <section className="space-y-3">
              <h3 className="font-black text-sm flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                <ClipboardCheck size={20} className="text-blue-600" /> Checklist Obrigatório
              </h3>
              <div className="grid gap-2">
                {Object.keys(activeTask.checklist).map(item => (
                  <label key={item} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.98] ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-100'}`}>
                    <input 
                      type="checkbox" 
                      checked={activeTask.checklist[item]} 
                      onChange={() => handleToggleCheck(item)} 
                      className="w-5 h-5 rounded text-emerald-600 border-slate-300 focus:ring-0" 
                    />
                    <span className={`font-bold text-xs leading-tight transition-colors ${activeTask.checklist[item] ? 'text-emerald-900' : 'text-slate-500'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-black text-sm flex items-center gap-2 text-amber-600 uppercase tracking-widest">
                <ShieldCheck size={20} /> Fator Mamãe (Fotos)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const draft = draftPhotos[req.id];
                  return (
                    <button key={req.id} onClick={() => { setCapturingFor({ id: req.id, category: 'MAMAE' }); fileInputRef.current?.click(); }} className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative shadow-inner hover:border-blue-300 transition-colors">
                      {draft?.uploading ? (
                        <div className="flex flex-col items-center gap-2 animate-pulse">
                          <Loader2 className="animate-spin text-blue-600" size={24} />
                          <span className="text-[7px] font-black text-blue-600 uppercase">Enviando...</span>
                        </div>
                      ) : draft?.url ? (
                        <img src={draft.url} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera size={24} className="text-slate-300" />
                          <span className="text-[7px] text-slate-400 uppercase font-black px-2 text-center mt-1">{req.label}</span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="p-4 bg-white border-t border-slate-100 absolute bottom-0 left-0 right-0 z-[110] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <button 
              disabled={isProcessing || !Object.values(activeTask.checklist).every(v => v)} 
              onClick={handleComplete} 
              className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest ${Object.values(activeTask.checklist).every(v => v) ? 'bg-emerald-600 text-white active:scale-95' : 'bg-slate-100 text-slate-300'}`}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <>CONCLUIR E NOTIFICAR <ArrowRight size={20} /></>}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE AUDITORIA DO GERENTE */}
      {auditTaskId && auditTask && (
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-bottom-20 duration-300 overscroll-none">
           <div className="bg-slate-900 p-6 pt-12 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-3xl font-black">AUDITORIA Q.{rooms.find(r => r.id === auditTask.roomId)?.number}</h2>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{users.find(u => u.id === auditTask.assignedTo)?.fullName}</p>
              </div>
              <button onClick={() => setAuditTaskId(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={24}/></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-36 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Conferência de Checklist</h3>
                <div className="grid gap-2">
                  {Object.entries(auditTask.checklist).map(([item, checked]) => (
                    <div key={item} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      {checked ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertCircle className="text-rose-400" size={18} />}
                      <span className={`text-xs font-bold ${checked ? 'text-slate-700' : 'text-rose-500 line-through'}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Evidências Fator Mamãe</h3>
                <div className="grid grid-cols-1 gap-4">
                  {FATOR_MAMAE_REQUIREMENTS.map(req => {
                    const photo = (auditTask.photos as any[])?.find((p: any) => p.type === req.id);
                    return (
                      <div key={req.id} className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase">{req.label}</p>
                        <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                           {photo ? <img src={photo.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-[10px]">FOTO NÃO ENVIADA</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
           </div>

           <div className="p-4 bg-white border-t border-slate-100 absolute bottom-0 left-0 right-0 flex gap-3 z-[110] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              <button 
                disabled={isProcessing}
                onClick={() => handleApprove(auditTask.id)}
                className="flex-1 py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase text-sm tracking-widest active:scale-95"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={20} /> APROVAR</>}
              </button>
              <button 
                onClick={() => setAuditTaskId(null)}
                className="px-6 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] active:scale-95"
              >
                VOLTAR
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
