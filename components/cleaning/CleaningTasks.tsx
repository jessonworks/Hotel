
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole, RoomStatus } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, Clock, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2, User as UserIcon, LayoutDashboard, History
} from 'lucide-react';
import { FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

const CleaningTasks: React.FC = () => {
  const { tasks, rooms, updateTask, approveTask, currentUser } = useStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturingFor, setCapturingFor] = useState<{ id: string, category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' } | null>(null);

  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  
  // STAFF (Rose/Karine): Recebe apenas o que foi designado ao seu ID único
  const myTasks = tasks.filter(t => 
    t.assignedTo === currentUser?.id && 
    (t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO)
  );

  // GERENTE: Monitora aprovações e o campo
  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO);
  const teamActivity = tasks.filter(t => 
    t.assignedTo !== currentUser?.id && 
    (t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO)
  );

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
    <div className="max-w-4xl mx-auto space-y-8 pb-32 px-2 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" capture="environment" />
      
      {!activeTask ? (
        <div className="space-y-12">
          
          {/* PAINEL GERENCIAL (AUDITORIA) */}
          {isAdminOrManager && (
            <>
              {pendingAudits.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20"><ShieldCheck size={20} /></div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Solicitações de Aprovação</h2>
                  </div>
                  <div className="grid gap-6">
                    {pendingAudits.map(task => {
                      const tr = rooms.find(r => r.id === task.roomId);
                      return (
                        <div key={task.id} className="bg-white border-2 border-amber-200 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 transition-all hover:scale-[1.01]">
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-600 font-black text-3xl border border-amber-100 shadow-inner">
                                {tr?.number}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1"><UserIcon size={12}/> {task.assignedByName}</p>
                                <p className="text-sm font-bold text-slate-700">Concluído em {task.durationMinutes || 1} min</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => approveTask(task.id)}
                              className="w-full sm:w-auto px-12 py-5 bg-emerald-600 text-white font-black rounded-[1.5rem] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs"
                            >
                              <CheckCircle2 size={24} /> APROVAR E LIBERAR
                            </button>
                          </div>
                          <div className="mt-8 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {task.photos?.filter(p => p.category === 'MAMAE').map((p, i) => (
                              <img key={i} src={p.url} className="w-32 h-32 rounded-[2rem] object-cover border-4 border-slate-50 shadow-md" alt="Audit" />
                            ))}
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
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Monitoramento de Campo</h2>
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
                                 {isWorking ? 'Em campo agora...' : 'Aguardando Início'}
                               </p>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isWorking ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                            {isWorking ? 'Limpando' : 'Pendente'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {pendingAudits.length === 0 && teamActivity.length === 0 && (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 text-center opacity-40">
                  <CheckCircle2 size={56} className="text-slate-200 mx-auto mb-6" />
                  <p className="text-slate-900 font-black text-xl">Tudo em ordem.</p>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Nenhuma atividade registrada no momento.</p>
                </div>
              )}
            </>
          )}

          {/* VISÃO DO STAFF (KARINE / ROSE) */}
          {!isAdminOrManager && (
            <section className="space-y-8">
              <header className="flex items-center gap-5 px-2">
                <div className="p-5 bg-slate-950 text-white rounded-[2rem] shadow-2xl">
                  <ClipboardCheck size={32} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Minha Pauta</h2>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Ordens enviadas pelo gerente</p>
                </div>
              </header>

              {myTasks.length === 0 ? (
                <div className="bg-white rounded-[3.5rem] border-2 border-dashed border-slate-200 p-24 text-center shadow-inner">
                  <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                    <CheckCircle2 size={56} className="text-slate-200" />
                  </div>
                  <h3 className="text-slate-900 font-black text-2xl mb-2">Sem novas ordens!</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Bom descanso ou aguarde o gerente.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {myTasks.map(task => {
                    const tr = rooms.find(r => r.id === task.roomId);
                    const isNew = task.status === CleaningStatus.PENDENTE;
                    return (
                      <div key={task.id} className="bg-white rounded-[3rem] border border-slate-200 p-10 flex flex-col items-center justify-between gap-10 shadow-2xl transition-all border-l-[16px] border-l-blue-600 hover:scale-[1.02]">
                        <div className="flex items-center gap-10 w-full">
                          <div className={`p-10 rounded-[2.5rem] ${isNew ? 'bg-amber-50 text-amber-500 shadow-amber-500/10' : 'bg-emerald-50 text-emerald-500 animate-pulse'}`}>
                            <Bed size={48} />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-6xl font-black text-slate-900 leading-none">{tr?.number}</h3>
                            <div className="flex items-center gap-3 text-rose-500 font-black text-sm uppercase tracking-[0.3em]">
                               <Clock size={20} /> PRAZO: {task.deadline || 'AGORA'}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => isNew ? handleStartPhoto(task.id) : setActiveTaskId(task.id)}
                          className="w-full py-8 bg-slate-950 text-white font-black rounded-[2.5rem] hover:bg-blue-600 transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-95 text-xl tracking-[0.1em] uppercase"
                        >
                          {isNew ? <><Camera size={28} /> REGISTRAR INÍCIO</> : <><Play size={28} /> CONTINUAR LIMPEZA</>}
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
        /* TELA DE EXECUÇÃO ATIVA (ROSE / KARINE) */
        <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10 h-full max-h-[96vh] flex flex-col">
          <div className="bg-slate-950 p-12 text-white shrink-0">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-7xl font-black mb-4 tracking-tighter">{room?.number}</h2>
                <div className="flex items-center gap-5 text-emerald-400 font-black text-6xl">
                  <Timer size={48} /> {formatTime(elapsed)}
                </div>
              </div>
              <button onClick={() => setActiveTaskId(null)} className="p-6 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={48} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 sm:p-14 space-y-16 pb-48 custom-scrollbar">
            <section className="space-y-8">
              <h3 className="font-black text-3xl flex items-center gap-5 text-slate-900 uppercase tracking-tighter">
                <ClipboardCheck size={40} className="text-blue-600" /> Checklist Operacional
              </h3>
              <div className="grid grid-cols-1 gap-5">
                {Object.keys(activeTask.checklist).map(item => (
                  <label key={item} className={`flex items-center gap-8 p-10 rounded-[2.5rem] border-2 transition-all cursor-pointer ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-400 shadow-inner' : 'bg-slate-50 border-slate-100'}`}>
                    <input type="checkbox" checked={activeTask.checklist[item]} onChange={() => handleToggleCheck(item)} className="w-12 h-12 rounded-3xl text-emerald-600 border-slate-300 shadow-sm" />
                    <span className={`font-black text-xl leading-snug ${activeTask.checklist[item] ? 'text-emerald-900' : 'text-slate-500'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <h3 className="font-black text-3xl flex items-center gap-5 text-amber-600 uppercase tracking-tighter">
                <ShieldCheck size={48} /> Auditoria Fator Mamãe
              </h3>
              <p className="text-base font-bold text-slate-400 uppercase tracking-[0.2em] px-2">Fotos reais dos cantos e detalhes</p>
              <div className="grid grid-cols-2 gap-8">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const photo = activeTask.photos?.find(p => p.type === req.id);
                  return (
                    <button key={req.id} onClick={() => { setCapturingFor({ id: req.id, category: 'MAMAE' }); fileInputRef.current?.click(); }} className="aspect-square bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center overflow-hidden hover:border-amber-400 transition-all shadow-inner relative">
                      {photo ? <img src={photo.url} className="w-full h-full object-cover" /> : 
                      <><Camera size={56} className="text-slate-300" /><span className="text-xs text-slate-400 uppercase font-black px-8 text-center tracking-tighter mt-4 leading-tight">{req.label}</span></>}
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="fixed bottom-12 left-12 right-12 z-[100]">
              <button 
                disabled={!Object.values(activeTask.checklist).every(v => v)} 
                onClick={handleComplete} 
                className={`w-full py-10 rounded-[3rem] font-black text-3xl shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all flex items-center justify-center gap-6 uppercase tracking-[0.1em] ${Object.values(activeTask.checklist).every(v => v) ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                ENTREGAR E LIBERAR <ArrowRight size={48} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
