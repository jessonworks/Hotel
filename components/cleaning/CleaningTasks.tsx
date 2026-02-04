
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { CleaningStatus, UserRole } from '../../types';
import { 
  Camera, X, Bed, Timer, Play, Clock, ShieldCheck, ClipboardCheck, ArrowRight, CheckCircle2, LayoutDashboard, MessageSquareText, Loader2, Eye, Check, AlertCircle, CloudUpload, ChevronLeft
} from 'lucide-react';
import { FATOR_MAMAE_REQUIREMENTS, WHATSAPP_NUMBER } from '../../constants';

// Função de compressão de imagem de alta performance
const compressImageToBlob = (base64Str: string, maxWidth = 1000, maxHeight = 800): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => { if (blob) resolve(blob!); }, 'image/jpeg', 0.6);
    };
  });
};

const CleaningTasks: React.FC = () => {
  const { tasks, rooms, updateTask, approveTask, uploadPhoto, currentUser, users } = useStore();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [auditTaskId, setAuditTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturingFor, setCapturingFor] = useState<{ id: string, category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' } | null>(null);
  
  // Estado local para fotos em upload
  const [draftPhotos, setDraftPhotos] = useState<Record<string, {url: string, uploading: boolean}>>({});

  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;
  
  const myTasks = tasks.filter(t => 
    t.assignedTo === currentUser?.id && 
    (t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO)
  );

  const pendingAudits = tasks.filter(t => t.status === CleaningStatus.AGUARDANDO_APROVACAO);
  const teamActivity = tasks.filter(t => t.status === CleaningStatus.PENDENTE || t.status === CleaningStatus.EM_PROGRESSO);

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId), [tasks, activeTaskId]);
  const auditTask = useMemo(() => tasks.find(t => t.id === auditTaskId), [tasks, auditTaskId]);
  const room = activeTask ? rooms.find(r => r.id === activeTask.roomId) : null;

  // Sincroniza fotos existentes do banco para o estado de rascunho
  useEffect(() => {
    if (activeTask) {
      const existing: Record<string, {url: string, uploading: boolean}> = {};
      (activeTask.photos as any[])?.forEach((p: any) => {
        if (p && p.type) existing[p.type] = { url: p.url, uploading: false };
      });
      setDraftPhotos(existing);
    } else {
      setDraftPhotos({});
    }
  }, [activeTaskId, activeTask]);

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

      setDraftPhotos(prev => ({ ...prev, [categoryId]: { url: '', uploading: true } }));

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressedBlob = await compressImageToBlob(reader.result as string);
          // Path organizado: ID_TAREFA/TIPO_FOTO_TIMSTAMP.jpg
          const fileName = `${activeTask.id}/${categoryId}_${Date.now()}.jpg`;
          const publicUrl = await uploadPhoto(compressedBlob, fileName);
          
          if (publicUrl) {
            setDraftPhotos(prev => ({ ...prev, [categoryId]: { url: publicUrl, uploading: false } }));
            
            const currentPhotos = (activeTask.photos || []) as any[];
            const otherPhotos = currentPhotos.filter((p: any) => p.type !== categoryId);
            const newPhoto = { type: categoryId, url: publicUrl, category: categoryLabel };
            
            const updates: any = { photos: [...otherPhotos, newPhoto] };
            if (categoryLabel === 'START') {
              updates.status = CleaningStatus.EM_PROGRESSO;
              updates.startedAt = new Date().toISOString();
            }
            await updateTask(activeTask.id, updates);
          } else {
            setDraftPhotos(prev => ({ ...prev, [categoryId]: { url: '', uploading: false } }));
            alert("⚠️ ERRO NO UPLOAD: Verifique se o bucket 'cleaning-photos' foi criado no Supabase Storage e está como Público.");
          }
        } catch (err) {
          console.error("Erro no processamento da imagem:", err);
          setDraftPhotos(prev => ({ ...prev, [categoryId]: { url: '', uploading: false } }));
        }
        setCapturingFor(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    if (!activeTask || isProcessing) return;
    setIsProcessing(true);
    try {
      const finalDuration = Math.max(1, Math.floor(elapsed / 60));
      
      // Fix: Add explicit type to Object.entries to resolve "Property 'url' does not exist on type 'unknown'"
      const finalPhotos = (Object.entries(draftPhotos) as [string, {url: string, uploading: boolean}][])
        .filter(([_, data]) => data.url)
        .map(([type, data]) => ({
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
      
      const message = `🚨 *RELATÓRIO HOSPEDAPRO*\nUnidade: ${room?.number}\nEquipe: ${currentUser?.fullName}\nTempo: ${Math.floor(elapsed/60)}m\nStatus: Conferência Pendente ✅`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
      
      setActiveTaskId(null);
      setElapsed(0);
    } catch (e) {
      console.error(e);
      alert("Erro ao finalizar tarefa.");
    } finally {
      setIsProcessing(false);
    }
  };

  const allChecksDone = activeTask ? Object.values(activeTask.checklist).every(v => v) : false;
  const anyUploading = Object.values(draftPhotos).some((p: any) => p.uploading);

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-32 px-2 animate-in fade-in duration-500">
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" capture="environment" />
      
      {!activeTask ? (
        <div className="space-y-6">
          {isAdminOrManager && (
            <>
              {pendingAudits.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2"><CheckCircle2 className="text-emerald-600" size={18}/> Auditoria Pendente</h2>
                  <div className="grid gap-3">
                    {pendingAudits.map(task => (
                      <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">{rooms.find(r => r.id === task.roomId)?.number}</div>
                          <div>
                            <p className="text-xs font-black text-slate-800">{users.find(u => u.id === task.assignedTo)?.fullName}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{task.durationMinutes} min de trabalho</p>
                          </div>
                        </div>
                        <button onClick={() => setAuditTaskId(task.id)} className="p-3 bg-slate-900 text-white rounded-xl active:scale-95 shadow-lg"><Eye size={16}/></button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 px-2">Minhas Unidades Designadas</h2>
            {myTasks.length === 0 ? (
              <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                <CheckCircle2 size={40} className="mx-auto mb-2 opacity-20" />
                <p className="font-black text-[10px] uppercase tracking-widest">Nada para fazer agora.</p>
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
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isNew ? 'bg-amber-100 text-amber-600' : 'bg-blue-600 text-white animate-pulse'}`}>
                          {isNew ? 'Pendente' : 'Limpando'}
                        </div>
                      </div>
                      <button 
                        onClick={() => isNew ? (setCapturingFor({id:'start_audit', category:'START'}), setActiveTaskId(task.id), setTimeout(()=>fileInputRef.current?.click(),100)) : setActiveTaskId(task.id)}
                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 uppercase text-xs tracking-widest shadow-xl"
                      >
                        {isNew ? <><Camera size={18}/> BATER FOTO E INICIAR</> : <><Play size={18}/> CONTINUAR CHECKLIST</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-white h-[100dvh] overflow-hidden animate-in slide-in-from-bottom-10">
          {/* HEADER SUPERIOR FIXO */}
          <div className="bg-slate-900 p-4 pt-10 text-white shrink-0 flex items-center justify-between shadow-2xl">
            <button onClick={() => setActiveTaskId(null)} className="p-2 hover:bg-white/10 rounded-full flex items-center gap-2">
              <ChevronLeft size={24} />
              <span className="font-black text-xs uppercase tracking-widest">Voltar</span>
            </button>
            <div className="text-center">
              <h2 className="text-xl font-black tracking-tighter leading-none">UNIDADE {room?.number}</h2>
              <div className="text-emerald-400 font-black text-xs flex items-center justify-center gap-1 mt-1">
                <Timer size={14} /> {Math.floor(elapsed/60)}:{(elapsed%60).toString().padStart(2,'0')}
              </div>
            </div>
            <button onClick={() => setActiveTaskId(null)} className="p-2 bg-white/10 rounded-full"><X size={20}/></button>
          </div>

          {/* CONTEÚDO SCROLLÁVEL */}
          <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-10 bg-slate-50">
            {activeTask.notes && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 shadow-sm">
                <MessageSquareText className="text-amber-600 shrink-0" size={20} />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">{activeTask.notes}</p>
              </div>
            )}

            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1">
                <ClipboardCheck size={18} className="text-blue-600"/> Checklist Obrigatório
              </h3>
              <div className="grid gap-3">
                {Object.keys(activeTask.checklist).map(item => (
                  <label key={item} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all active:scale-[0.98] cursor-pointer shadow-sm ${activeTask.checklist[item] ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'}`}>
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
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1">
                <ShieldCheck size={18} className="text-amber-500"/> Fator Mamãe (Nuvem)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {FATOR_MAMAE_REQUIREMENTS.map(req => {
                  const photo = draftPhotos[req.id];
                  return (
                    <button 
                      key={req.id} 
                      onClick={() => { setCapturingFor({id:req.id, category:'MAMAE'}); fileInputRef.current?.click(); }}
                      className="aspect-video bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative active:scale-95 transition-all shadow-inner"
                    >
                      {photo?.uploading ? (
                        <div className="flex flex-col items-center gap-2 text-blue-600 bg-blue-50 w-full h-full justify-center">
                          <CloudUpload className="animate-bounce" size={24}/>
                          <span className="text-[7px] font-black uppercase tracking-widest">Salvando...</span>
                        </div>
                      ) : photo?.url ? (
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

          {/* FOOTER FIXO E SEMPRE VISÍVEL */}
          <div className="shrink-0 p-4 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom,20px)] shadow-[0_-15px_40px_rgba(0,0,0,0.1)]">
            <button 
              disabled={isProcessing || anyUploading || !allChecksDone}
              onClick={handleComplete}
              className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 shadow-2xl ${allChecksDone && !anyUploading ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'}`}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : anyUploading ? 'AGUARDANDO UPLOADS...' : <>FINALIZAR TAREFA <ArrowRight/></>}
            </button>
          </div>
        </div>
      )}

      {/* MODAL AUDITORIA (VISTA PELO GERENTE) */}
      {auditTaskId && auditTask && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col h-[100dvh] animate-in slide-in-from-right duration-300 overflow-hidden">
          <div className="bg-slate-900 p-6 pt-12 text-white flex justify-between items-center shrink-0 shadow-xl">
            <div>
              <h2 className="text-3xl font-black tracking-tighter leading-none">AUDITORIA {rooms.find(r => r.id === auditTask.roomId)?.number}</h2>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mt-2">EQUIPE: {users.find(u => u.id === auditTask.assignedTo)?.fullName}</p>
            </div>
            <button onClick={() => setAuditTaskId(null)} className="p-2 bg-white/10 rounded-full active:scale-90"><X/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-10 bg-slate-50 pb-20">
             <section className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2 px-1">Evidências Fator Mamãe</h3>
                <div className="grid gap-8">
                   {(auditTask.photos as any[])?.filter(p => p.category === 'MAMAE' || p.category === 'START').map((p: any, i: number) => (
                     <div key={i} className="space-y-2 bg-white p-3 rounded-3xl shadow-sm border border-slate-100">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                          {p.category === 'START' ? 'FOTO DE INÍCIO' : (FATOR_MAMAE_REQUIREMENTS.find(r => r.id === p.type)?.label || 'Foto')}
                        </p>
                        <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-white shadow-inner">
                           <img src={p.url} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                     </div>
                   ))}
                </div>
             </section>
          </div>
          <div className="shrink-0 p-4 flex gap-3 border-t bg-white pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
             <button onClick={() => approveTask(auditTask.id).then(() => setAuditTaskId(null))} className="flex-1 py-5 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 uppercase text-sm tracking-widest active:scale-95 shadow-xl transition-all"><Check/> APROVAR TAREFA</button>
             <button onClick={() => setAuditTaskId(null)} className="px-6 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px] active:scale-95">VOLTAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningTasks;
