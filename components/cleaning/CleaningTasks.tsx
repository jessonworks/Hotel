
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole, RoomStatus } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, Clock, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2, User as UserIcon, LayoutDashboard, MessageSquareText
} from 'lucide-react';
import { FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

const CleaningTasks: React.FC = () => {
  const { tasks, rooms, updateTask, approveTask, currentUser, users } = useStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturingFor, setCapturingFor] = useState<{ id: string, category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' } | null>(null);

  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  
  const myTasks = tasks.filter(t => 
    t.assignedTo === currentUser?.id && 
    (t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO)
  );

  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO);

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
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Aprovações</h2>
                  </div>
                  <div className="grid gap-4">
                    {pendingAudits.map(task => {
                      const tr = rooms.find(r => r.id === task.roomId);
                      return (
                        <div key={task.id} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl border border-blue-100">
                                {tr?.number}
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.assignedByName}</p>
                                <p className="text-xs font-bold text-slate-700">{task.durationMinutes || 1} min decorridos</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => approveTask(task.id)}
                              className="px-4 py-3 bg-emerald-600 text-white font-black rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                            >
                              APROVAR
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
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Equipe Ativa</h2>
                  </div>
                  <div className="grid gap-2">
                    {teamActivity.map(task => {
                      const tr = rooms.find(r => r.id === task.roomId);
                      const isWorking = task.status === CleaningStatus.EM_PROGRESSO;
                      return (
                        <div key={task.id} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="font-black text-slate-300 text-sm">#{tr?.number}</div>
                            <p className="text-xs font-black text-slate-800">{task.assignedByName}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isWorking ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                            {isWorking ? 'Trabalhando' : 'Pendente'}
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
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Minhas Faxinas</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Siga as instruções abaixo</p>
                </div>
              </header>

              {myTasks.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-12 text-center">
                  <CheckCircle2 size={48} className="text-slate-200 mx-auto mb-4" />
                  <h3 className="text-slate-900 font-black text-xl mb-1">Tudo limpo por aqui!</h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhuma tarefa pendente no momento.</p>
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
                          {isNew ? <><Camera size={20} /> INICIAR</> : <><Play size={20} /> CONTINUAR</>}
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
        <div className="bg-white fixed inset-0 z-[100] flex flex-col animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 p-6 pt-10 text-white shrink-0">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-5xl font-black tracking-tighter">{room?.number}</h2>
                <div className="flex items-center gap-2 text-emerald-400 font-black text-2xl">
                  <Timer size={24} /> {formatTime(elapsed)}
                </div>
              </div>
              <button onClick={() => setActiveTaskId(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={32} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 custom-scrollbar">
            <section className="space-y-4">
              <h3 className="font-black text-lg flex items-center gap-3 text-slate-900 uppercase tracking-tight">
                <ClipboardCheck size={24} className="text-blue-600" /> Checklist
              </h3>
              <div className="grid gap-3">
                {Object.keys(activeTask.checklist).map(item => (
                  <label key={item} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-400 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                    <input type="checkbox" checked={activeTask.checklist[item]} onChange={() => handleToggleCheck(item)} className="w-6 h-6 rounded-md text-emerald-600 border-slate-300" />
                    <span className={`font-bold text-sm leading-tight ${activeTask.checklist[item] ? 'text-emerald-900' : 'text-slate-500'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-black text-lg flex items-center gap-3 text-amber-600 uppercase tracking-tight">
                <ShieldCheck size={28} /> Fotos Fator Mamãe
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const photo = activeTask.photos?.find(p => p.type === req.id);
                  return (
                    <button key={req.id} onClick={() => { setCapturingFor({ id: req.id, category: 'MAMAE' }); fileInputRef.current?.click(); }} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center overflow-hidden hover:border-amber-400 transition-all shadow-inner relative group">
                      {photo ? <img src={photo.url} className="w-full h-full object-cover" /> : 
                      <><Camera size={32} className="text-slate-300" /><span className="text-[8px] text-slate-400 uppercase font-black px-2 text-center mt-2 leading-tight">{req.label}</span></>}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="p-6 bg-white border-t border-slate-100 absolute bottom-0 left-0 right-0 z-[101]">
            <button 
              disabled={!Object.values(activeTask.checklist).every(v => v)} 
              onClick={handleComplete} 
              className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest ${Object.values(activeTask.checklist).every(v => v) ? 'bg-emerald-600 text-white active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
            >
              FINALIZAR <ArrowRight size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
