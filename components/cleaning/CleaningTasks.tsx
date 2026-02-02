
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, MessageCircle, AlertCircle, Clock, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2
} from 'lucide-react';
import { FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

const CleaningTasks: React.FC = () => {
  const { tasks, rooms, updateTask, approveTask, currentUser } = useStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturingFor, setCapturingFor] = useState<{ id: string, category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' } | null>(null);

  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  const activeTask = tasks.find(t => t.id === activeTaskId);
  const room = activeTask ? rooms.find(r => r.id === activeTask.roomId) : null;

  // Filtro de tarefas corrigido: Se for gerente vê tudo, se for staff vê apenas o que foi designado para seu ID
  const myTasks = tasks.filter(t => {
    const isAssignedToMe = t.assignedTo === currentUser?.id;
    const isPendingOrActive = t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO;
    
    if (isAdminOrManager) return isPendingOrActive;
    return isAssignedToMe && isPendingOrActive;
  });

  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO);

  useEffect(() => {
    let interval: any;
    if (activeTask?.status === CleaningStatus.EM_PROGRESSO && activeTask.startedAt) {
      interval = setInterval(() => {
        const start = new Date(activeTask.startedAt!).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
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
    updateTask(activeTask.id, { 
      status: CleaningStatus.AGUARDANDO_APROVACAO,
      completedAt: new Date().toISOString(),
      durationMinutes: Math.floor(elapsed / 60),
      fatorMamaeVerified: true
    });
    
    const message = `🚨 *RELATÓRIO HOSPEDAPRO*\nUnidade: ${room?.number || 'Área'}\nEquipe: ${currentUser?.fullName}\nTempo: ${formatTime(elapsed)}\nStatus: Auditoria Fator Mamãe Realizada ✅`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    
    setActiveTaskId(null);
    setElapsed(0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 px-2 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" capture="environment" />
      
      {!activeTask ? (
        <div className="space-y-10">
          {isAdminOrManager && pendingAudits.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><ShieldCheck size={20} /></div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Aguardando Auditoria Gerenical</h2>
              </div>
              <div className="grid gap-4">
                {pendingAudits.map(task => {
                  const tr = rooms.find(r => r.id === task.roomId);
                  return (
                    <div key={task.id} className="bg-white border-2 border-amber-200 rounded-[2.5rem] p-6 shadow-xl shadow-amber-500/10 animate-pulse-subtle">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-black text-2xl">
                            {tr?.number}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Equipe: {task.assignedByName}</p>
                            <p className="text-sm font-bold text-slate-700">Concluído em: {task.durationMinutes} min</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => approveTask(task.id)}
                            className="px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"
                          >
                            <CheckCircle2 size={18} /> APROVAR E LIBERAR
                          </button>
                        </div>
                      </div>
                      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {task.photos?.filter(p => p.category === 'MAMAE').map((p, i) => (
                          <img key={i} src={p.url} className="w-20 h-20 rounded-xl object-cover border border-slate-100" alt="Audit" />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <header className="flex items-center gap-4 px-2">
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                <ClipboardCheck size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Minhas Faxinas Designadas</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tarefas atribuídas a você</p>
              </div>
            </header>

            {myTasks.length === 0 ? (
              <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center">
                <p className="text-slate-900 font-black text-lg">Sem tarefas pendentes!</p>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Aguarde novas designações da gerência.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {myTasks.map(task => {
                  const tr = rooms.find(r => r.id === task.roomId);
                  const isPending = task.status === CleaningStatus.PENDENTE;
                  return (
                    <div key={task.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-xl transition-all border-l-4 border-l-blue-600">
                      <div className="flex items-center gap-6 flex-1">
                        <div className={`p-5 rounded-2xl ${isPending ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500 animate-pulse'}`}>
                          <Bed size={28} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-2xl font-black text-slate-900">{tr?.number}</h3>
                          <p className="text-rose-500 font-black text-xs uppercase">PRAZO: {task.deadline || '--:--'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => isPending ? handleStartPhoto(task.id) : setActiveTaskId(task.id)}
                        className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-lg"
                      >
                        {isPending ? <><Camera size={18} /> INICIAR TRABALHO</> : <><Play size={18} /> CONTINUAR</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 p-8 text-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-4xl font-black mb-2">{room?.number}</h2>
                <div className="flex items-center gap-2 text-emerald-400 font-black text-3xl">
                  <Timer size={28} /> {formatTime(elapsed)}
                </div>
              </div>
              <button onClick={() => setActiveTaskId(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-10">
            <section className="space-y-4">
              <h3 className="font-black text-lg flex items-center gap-3 text-slate-900 uppercase">
                <ClipboardCheck size={20} className="text-blue-500" /> Checklist Operacional
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.keys(activeTask.checklist).map(item => (
                  <label key={item} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                    <input type="checkbox" checked={activeTask.checklist[item]} onChange={() => handleToggleCheck(item)} className="w-6 h-6 rounded-lg text-emerald-600" />
                    <span className={`font-bold text-sm ${activeTask.checklist[item] ? 'text-emerald-700' : 'text-slate-700'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-black text-lg flex items-center gap-3 text-amber-600 uppercase">
                <ShieldCheck size={24} /> Auditoria Fator Mamãe
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const photo = activeTask.photos?.find(p => p.type === req.id);
                  return (
                    <button key={req.id} onClick={() => { setCapturingFor({ id: req.id, category: 'MAMAE' }); fileInputRef.current?.click(); }} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center overflow-hidden hover:border-amber-400 transition-all shadow-inner group">
                      {photo ? <img src={photo.url} className="w-full h-full object-cover" /> : 
                      <><Camera size={24} className="text-slate-300" /><span className="text-[8px] text-slate-400 uppercase font-black px-2 text-center tracking-widest mt-1">{req.label}</span></>}
                    </button>
                  )
                })}
              </div>
            </section>

            <button 
              disabled={!Object.values(activeTask.checklist).every(v => v)} 
              onClick={handleComplete} 
              className={`w-full py-6 rounded-3xl font-black text-xl shadow-xl transition-all ${Object.values(activeTask.checklist).every(v => v) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-300'}`}
            >
              FINALIZAR E ENVIAR <ArrowRight size={24} className="ml-2 inline" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
