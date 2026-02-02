
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, MessageCircle, AlertCircle, Clock, ShieldCheck, ClipboardCheck, ArrowRight
} from 'lucide-react';
import { FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

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
    const message = `🚨 *RELATÓRIO HOSPEDAPRO*\nUnidade: ${room?.number || 'Área'}\nEquipe: ${currentUser?.fullName}\nTempo: ${formatTime(elapsed)}\nStatus: Auditoria Fator Mamãe Realizada ✅`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    setActiveTaskId(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 px-2 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" capture="environment" />
      
      {!activeTask ? (
        <div className="space-y-6">
          <header className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Faxinas do Dia</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Suas atribuições atuais</p>
            </div>
          </header>

          {myTasks.length === 0 ? (
            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <p className="text-slate-900 font-black text-lg">Hotel Limpo!</p>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhuma tarefa pendente.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myTasks.map(task => {
                const tr = rooms.find(r => r.id === task.roomId);
                const isPending = task.status === CleaningStatus.PENDENTE;
                return (
                  <div key={task.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-xl transition-all border-l-4 border-l-blue-600 active:scale-95">
                    <div className="flex items-center gap-6 flex-1">
                      <div className={`p-5 rounded-2xl transition-colors ${isPending ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        <Bed size={28} />
                      </div>
                      <div className="space-y-1 text-center sm:text-left">
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <h3 className="text-2xl font-black text-slate-900">{tr?.number}</h3>
                          <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="flex items-center gap-2 text-rose-500 font-black text-xs justify-center sm:justify-start">
                          <Clock size={14} /> LIMITE: {task.deadline || '--:--'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => isPending ? handleStartPhoto(task.id) : setActiveTaskId(task.id)}
                      className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-lg text-sm"
                    >
                      {isPending ? <><Camera size={18} /> COMEÇAR</> : <><Play size={18} /> RETOMAR</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 p-8 text-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-4xl font-black">{room?.number}</h2>
                  <div className="bg-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {room?.bedsCount ? `${room.bedsCount} Camas` : 'Área Comum'} 
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-black text-2xl">
                  <Timer size={24} /> {formatTime(elapsed)}
                </div>
              </div>
              <button onClick={() => setActiveTaskId(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-10">
            <section className="space-y-4">
              <h3 className="font-black text-lg flex items-center gap-3 text-slate-900 uppercase tracking-tight">
                <ClipboardCheck size={20} className="text-blue-500" /> Checklist Operacional
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.keys(activeTask.checklist).map(item => (
                  <label key={item} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                    <input type="checkbox" checked={activeTask.checklist[item]} onChange={() => handleToggleCheck(item)} className="w-6 h-6 rounded-lg text-emerald-600 focus:ring-0" />
                    <span className={`font-bold text-sm ${activeTask.checklist[item] ? 'text-emerald-700' : 'text-slate-700'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="font-black text-lg flex items-center gap-3 text-amber-600 uppercase tracking-tight">
                <ShieldCheck size={24} /> Auditoria Fator Mamãe
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const photo = activeTask.photos?.find(p => p.type === req.id);
                  return (
                    <button key={req.id} onClick={() => { setCapturingFor({ id: req.id, category: 'MAMAE' }); fileInputRef.current?.click(); }} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center overflow-hidden hover:border-amber-400 transition-all shadow-inner group">
                      {photo ? <img src={photo.url} className="w-full h-full object-cover" /> : 
                      <><div className="p-3 bg-white rounded-xl mb-2 shadow-sm group-hover:scale-110 transition-transform text-slate-300"><Camera size={24} /></div><span className="text-[8px] text-slate-400 uppercase font-black px-2 text-center tracking-widest leading-tight">{req.label}</span></>}
                    </button>
                  )
                })}
              </div>
            </section>

            <button 
              disabled={!Object.values(activeTask.checklist).every(v => v)} 
              onClick={handleComplete} 
              className={`w-full py-6 rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4 ${Object.values(activeTask.checklist).every(v => v) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
            >
              FINALIZAR FAXINA <ArrowRight size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
