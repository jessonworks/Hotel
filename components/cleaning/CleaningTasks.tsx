
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, MessageCircle, AlertCircle, Clock, ShieldCheck, ClipboardCheck, ArrowRight
} from 'lucide-react';
import { CLEANING_CHECKLIST_TEMPLATE, FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

const CleaningTasks: React.FC = () => {
  const { tasks, rooms, updateTask, currentUser } = useStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturingFor, setCapturingFor] = useState<{ id: string, category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' } | null>(null);

  const activeTask = tasks.find(t => t.id === activeTaskId);
  const room = activeTask ? rooms.find(r => r.id === activeTask.roomId) : null;

  const myTasks = tasks.filter(t => 
    (t.assignedTo === currentUser?.id || currentUser?.role !== UserRole.STAFF) && 
    t.status !== CleaningStatus.APROVADO
  );

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
    const message = `🚨 *RELATÓRIO HOSPEDAPRO*\nQuarto: ${room?.number}\nEquipe: ${currentUser?.fullName}\nTempo: ${formatTime(elapsed)}\nStatus: Auditoria Fator Mamãe Realizada ✅`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    setActiveTaskId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 px-2">
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" capture="environment" />
      
      {!activeTask ? (
        <div className="space-y-8">
          <header className="flex items-center gap-4">
            <div className="p-4 bg-slate-900 text-white rounded-[1.8rem] shadow-xl">
              <ClipboardCheck size={28} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Faxinas do Dia</h2>
          </header>

          {myTasks.length === 0 ? (
            <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-20 text-center">
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={48} />
              </div>
              <p className="text-slate-900 font-black text-2xl">Hotel Limpo!</p>
              <p className="text-slate-400 font-bold">Nenhuma tarefa pendente no momento.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {myTasks.map(task => {
                const tr = rooms.find(r => r.id === task.roomId);
                const isPending = task.status === CleaningStatus.PENDENTE;
                return (
                  <div key={task.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-2xl transition-all border-l-8 border-l-blue-600 group active:scale-95">
                    <div className="flex items-center gap-10 flex-1">
                      <div className={`p-8 rounded-[2.2rem] transition-colors ${isPending ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        <Bed size={48} />
                      </div>
                      <div className="space-y-2 text-center md:text-left">
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                          <h3 className="text-4xl font-black text-slate-900">{tr?.number}</h3>
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="flex items-center gap-2 text-rose-500 font-black text-sm justify-center md:justify-start">
                          <Clock size={18} /> LIMITE: {task.deadline || '--:--'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => isPending ? handleStartPhoto(task.id) : setActiveTaskId(task.id)}
                      className="w-full md:w-auto px-12 py-6 bg-slate-900 text-white font-black rounded-[1.8rem] hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-2xl"
                    >
                      {isPending ? <><Camera size={24} /> COMEÇAR</> : <><Play size={24} /> RETOMAR</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-right-10">
          <div className="bg-slate-900 p-12 text-white">
            <div className="flex justify-between items-start mb-10">
              <div>
                <div className="flex items-center gap-5 mb-4">
                  <h2 className="text-6xl font-black">{room?.number}</h2>
                  <div className="bg-blue-600 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest">
                    {room?.bedsCount} Camas
                  </div>
                </div>
                <div className="flex items-center gap-4 text-emerald-400 font-black text-4xl">
                  <Timer size={40} /> {formatTime(elapsed)}
                </div>
              </div>
              <button onClick={() => setActiveTaskId(null)} className="p-5 bg-white/10 hover:bg-white/20 rounded-full">
                <X size={36} />
              </button>
            </div>
          </div>

          <div className="p-12 space-y-16">
            <section className="space-y-8">
              <h3 className="font-black text-3xl flex items-center gap-4 text-slate-900">
                <ClipboardCheck size={36} className="text-blue-500" /> Checklist Operacional
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CLEANING_CHECKLIST_TEMPLATE.map(item => (
                  <label key={item} className={`flex items-center gap-6 p-7 rounded-[2.2rem] border-4 transition-all cursor-pointer ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-blue-300'}`}>
                    <input type="checkbox" checked={activeTask.checklist[item]} onChange={() => handleToggleCheck(item)} className="w-8 h-8 rounded-xl text-emerald-600 focus:ring-0" />
                    <span className={`font-black text-xl ${activeTask.checklist[item] ? 'text-emerald-700' : 'text-slate-700'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <h3 className="font-black text-3xl flex items-center gap-4 text-amber-600">
                <ShieldCheck size={42} /> Auditoria Fator Mamãe
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const photo = activeTask.photos?.find(p => p.type === req.id);
                  return (
                    <button key={req.id} onClick={() => { setCapturingFor({ id: req.id, category: 'MAMAE' }); fileInputRef.current?.click(); }} className="aspect-square bg-slate-50 border-4 border-dashed border-slate-200 rounded-[2.8rem] flex flex-col items-center justify-center overflow-hidden hover:border-amber-400 transition-all shadow-inner group">
                      {photo ? <img src={photo.url} className="w-full h-full object-cover" /> : 
                      <><div className="p-5 bg-white rounded-2xl mb-4 shadow-sm group-hover:scale-110 transition-transform text-slate-300"><Camera size={36} /></div><span className="text-[10px] text-slate-400 uppercase font-black px-4 text-center tracking-widest">{req.label}</span></>}
                    </button>
                  )
                })}
              </div>
            </section>

            <button 
              disabled={!Object.values(activeTask.checklist).every(v => v)} 
              onClick={handleComplete} 
              className={`w-full py-10 rounded-[3rem] font-black text-4xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-6 ${Object.values(activeTask.checklist).every(v => v) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              FINALIZAR <ArrowRight size={44} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
