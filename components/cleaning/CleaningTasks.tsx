
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole, RoomStatus } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, Clock, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2, User as UserIcon, LayoutDashboard, History, MessageSquareText
} from 'lucide-react';
import { FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

const CleaningTasks: React.FC = () => {
  const { tasks, rooms, updateTask, approveTask, currentUser, users } = useStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturingFor, setCapturingFor] = useState<{ id: string, category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' } | null>(null);

  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  
  // MINHAS TAREFAS (Aparece para a Rose se o ID for o dela)
  const myTasks = tasks.filter(t => 
    t.assignedTo === currentUser?.id && 
    (t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO)
  );

  // AUDITORIAS (Só para Admin/Manager)
  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO);

  // EQUIPE EM ATIVIDADE (Apenas quem REALMENTE tem tarefa STAFF ativa)
  const teamActivity = tasks.filter(t => {
    const assignedUser = users.find(u => u.id === t.assignedTo);
    return assignedUser?.role === UserRole.STAFF && 
           (t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO);
  });

  const activeTask = tasks.find(t => t.id === activeTaskId);
  const room = activeTask ? rooms.find(r => r.id === activeTask.roomId) : null;

  useEffect(() => {
    let interval: any;
    if (activeTask?.status === CleaningStatus.EM_PROGRESSO && activeTask.startedAt) {
      interval = setInterval(() => {
        const start = new Date(activeTask.startedAt!).getTime();
        setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTask?.status, activeTask?.startedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartPhoto = (taskId: string) => {
    if (isAdminOrManager) return;
    setCapturingFor({ id: 'start_audit', category: 'START' });
    setActiveTaskId(taskId);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeTask && capturingFor) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const photos = [...(activeTask.photos || []), { type: capturingFor.id, url: reader.result as string, category: capturingFor.category }];
        const updates: any = { photos };
        if (capturingFor.category === 'START') {
          updates.status = CleaningStatus.EM_PROGRESSO;
          updates.startedAt = new Date().toISOString();
        }
        updateTask(activeTask.id, updates);
        setCapturingFor(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleCheck = (item: string) => {
    if (!activeTask) return;
    const newChecklist = { ...activeTask.checklist, [item]: !activeTask.checklist[item] };
    updateTask(activeTask.id, { checklist: newChecklist });
  };

  const handleComplete = () => {
    if (!activeTask) return;
    const finalDuration = Math.max(1, Math.floor(elapsed / 60));
    updateTask(activeTask.id, { 
      status: CleaningStatus.AGUARDANDO_APROVACAO,
      completedAt: new Date().toISOString(),
      durationMinutes: finalDuration,
      fatorMamaeVerified: true
    });
    
    const message = `🚨 *RELATÓRIO HOSPEDAPRO*\nUnidade: ${room?.number}\nEquipe: ${currentUser?.fullName}\nTempo: ${formatTime(elapsed)}\nStatus: Conferência Pendente ✅`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    
    setActiveTaskId(null);
    setElapsed(0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-40 px-2 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" capture="environment" />
      
      {!activeTask ? (
        <div className="space-y-12">
          {isAdminOrManager && (
            <>
              {pendingAudits.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20"><CheckCircle2 size={20} /></div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Aprovações Pendentes</h2>
                  </div>
                  <div className="grid gap-6">
                    {pendingAudits.map(task => {
                      const tr = rooms.find(r => r.id === task.roomId);
                      return (
                        <div key={task.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 shadow-xl transition-all">
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-5">
                              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 font-black text-3xl border border-blue-100 shadow-inner">
                                {tr?.number}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1"><UserIcon size={12}/> {task.assignedByName}</p>
                                <p className="text-sm font-bold text-slate-700">Concluído em {task.durationMinutes || 1} min</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => approveTask(task.id)}
                              className="w-full sm:w-auto px-10 py-6 bg-emerald-600 text-white font-black rounded-[1.5rem] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs"
                            >
                              <CheckCircle2 size={24} /> APROVAR E LIBERAR
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {teamActivity.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><LayoutDashboard size={20} /></div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Equipe de Campo em Atividade</h2>
                  </div>
                  <div className="grid gap-3">
                    {teamActivity.map(task => {
                      const tr = rooms.find(r => r.id === task.roomId);
                      const isWorking = task.status === CleaningStatus.EM_PROGRESSO;
                      return (
                        <div key={task.id} className="bg-white rounded-3xl border border-slate-100 p-5 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="font-black text-slate-300 text-xl">#{tr?.number}</div>
                            <div>
                               <p className="text-sm font-black text-slate-800 leading-none">{task.assignedByName}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                 {isWorking ? 'Em campo agora...' : 'Tarefa Pendente'}
                               </p>
                            </div>
                          </div>
                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isWorking ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                            {isWorking ? 'Executando' : 'Aguardando'}
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
            <section className="space-y-8">
              <header className="flex items-center gap-5 px-2">
                <div className="p-6 bg-[#0F172A] text-white rounded-[2rem] shadow-2xl">
                  <ClipboardCheck size={40} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Minha Pauta</h2>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Siga as ordens do gerente</p>
                </div>
              </header>

              {myTasks.length === 0 ? (
                <div className="bg-white rounded-[3.5rem] border-2 border-dashed border-slate-200 p-24 text-center">
                  <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 size={64} className="text-slate-200" />
                  </div>
                  <h3 className="text-slate-900 font-black text-2xl mb-2">Sem novas tarefas!</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Aguarde novas instruções.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {myTasks.map(task => {
                    const tr = rooms.find(r => r.id === task.roomId);
                    const isNew = task.status === CleaningStatus.PENDENTE;
                    return (
                      <div key={task.id} className="bg-white rounded-[3rem] border border-slate-200 p-10 flex flex-col items-center justify-between gap-10 shadow-2xl transition-all border-l-[20px] border-l-blue-600">
                        <div className="flex items-center gap-10 w-full">
                          <div className={`p-10 rounded-[2.5rem] ${isNew ? 'bg-amber-50 text-amber-500 shadow-amber-500/10' : 'bg-emerald-50 text-emerald-500 animate-pulse'}`}>
                            <Bed size={56} />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-6xl font-black text-slate-900 leading-none">{tr?.number}</h3>
                            <div className="flex items-center gap-3 text-rose-500 font-black text-sm uppercase tracking-[0.3em]">
                               <Clock size={24} /> PRAZO: {task.deadline || 'URGENTE'}
                            </div>
                            {task.notes && (
                              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3 mt-4">
                                <MessageSquareText size={20} className="text-amber-600 shrink-0" />
                                <p className="text-sm font-bold text-amber-900 leading-tight">Nota: {task.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => isNew ? handleStartPhoto(task.id) : setActiveTaskId(task.id)}
                          className="w-full py-10 bg-[#0F172A] text-white font-black rounded-[2.5rem] hover:bg-blue-600 transition-all flex items-center justify-center gap-6 shadow-2xl active:scale-95 text-2xl tracking-[0.1em] uppercase"
                        >
                          {isNew ? <><Camera size={32} /> REGISTRAR INÍCIO</> : <><Play size={32} /> CONTINUAR</>}
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
        <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10 h-full max-h-[98vh] flex flex-col">
          <div className="bg-[#0F172A] p-10 text-white shrink-0">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-7xl font-black mb-2 tracking-tighter">{room?.number}</h2>
                <div className="flex items-center gap-5 text-emerald-400 font-black text-6xl">
                  <Timer size={48} /> {formatTime(elapsed)}
                </div>
              </div>
              <button onClick={() => setActiveTaskId(null)} className="p-6 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={56} />
              </button>
            </div>
            {activeTask.notes && (
               <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex items-start gap-4">
                  <MessageSquareText size={32} className="text-blue-400 shrink-0" />
                  <p className="text-xl font-bold text-white leading-tight">Instrução: {activeTask.notes}</p>
               </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-10 sm:p-14 space-y-20 pb-60 custom-scrollbar">
            <section className="space-y-10">
              <h3 className="font-black text-4xl flex items-center gap-6 text-slate-900 uppercase tracking-tighter">
                <ClipboardCheck size={48} className="text-blue-600" /> Itens Obrigatórios
              </h3>
              <div className="grid grid-cols-1 gap-6">
                {Object.keys(activeTask.checklist).map(item => (
                  <label key={item} className={`flex items-center gap-8 p-10 rounded-[3rem] border-4 transition-all cursor-pointer ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-400 shadow-inner' : 'bg-slate-50 border-slate-100'}`}>
                    <input type="checkbox" checked={activeTask.checklist[item]} onChange={() => handleToggleCheck(item)} className="w-14 h-14 rounded-2xl text-emerald-600 border-slate-300" />
                    <span className={`font-black text-2xl leading-snug ${activeTask.checklist[item] ? 'text-emerald-900' : 'text-slate-500'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-10">
              <h3 className="font-black text-4xl flex items-center gap-6 text-amber-600 uppercase tracking-tighter">
                <ShieldCheck size={56} /> Fotos Fator Mamãe
              </h3>
              <div className="grid grid-cols-2 gap-8">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const photo = activeTask.photos?.find(p => p.type === req.id);
                  return (
                    <button key={req.id} onClick={() => { setCapturingFor({ id: req.id, category: 'MAMAE' }); fileInputRef.current?.click(); }} className="aspect-square bg-slate-50 border-4 border-dashed border-slate-200 rounded-[4rem] flex flex-col items-center justify-center overflow-hidden hover:border-amber-400 transition-all shadow-inner relative group">
                      {photo ? <img src={photo.url} className="w-full h-full object-cover" /> : 
                      <><Camera size={64} className="text-slate-300 group-hover:text-amber-500" /><span className="text-xs text-slate-400 uppercase font-black px-10 text-center tracking-tighter mt-5 leading-tight">{req.label}</span></>}
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="fixed bottom-12 left-8 right-8 z-[1000]">
              <button 
                disabled={!Object.values(activeTask.checklist).every(v => v)} 
                onClick={handleComplete} 
                className={`w-full py-12 rounded-[3.5rem] font-black text-4xl shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-all flex items-center justify-center gap-8 uppercase tracking-[0.1em] ${Object.values(activeTask.checklist).every(v => v) ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                CONCLUIR E ENVIAR <ArrowRight size={56} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
