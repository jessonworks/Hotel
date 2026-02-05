
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction, PaymentMethod
} from './types';
import { CHECKLIST_TEMPLATES } from './constants';

const getEnv = (key: string): string => {
  try {
    // Busca exaustiva em todas as possíveis fontes de variáveis de ambiente
    return (
      (window as any).process?.env?.[key] || 
      (typeof process !== 'undefined' ? process.env[key] : '') ||
      (window as any).importMeta?.env?.[key] ||
      ''
    );
  } catch {
    return '';
  }
};

const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');

// Cliente Supabase instanciado apenas se as chaves existirem
export const supabase: SupabaseClient | null = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

interface AppState {
  currentUser: User | null;
  users: User[];
  rooms: Room[];
  tasks: CleaningTask[];
  laundry: LaundryItem[];
  guests: Guest[];
  inventory: InventoryItem[];
  announcements: Announcement[];
  transactions: Transaction[];
  isSupabaseConnected: boolean;
  isInitialLoading: boolean;
  connectionError: string | null;
  
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  syncData: () => Promise<void>;
  subscribeToChanges: () => () => void;
  checkConnection: () => Promise<void>;
  
  updateCurrentUser: (updates: Partial<User>) => void;
  updateUserPassword: (userId: string, newPass: string) => Promise<void>;
  uploadPhoto: (file: Blob, path: string) => Promise<string | null>;
  
  createTask: (data: Partial<CleaningTask>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<CleaningTask>) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  updateRoomICal: (roomId: string, icalUrl: string) => Promise<void>;
  syncICal: (roomId: string) => Promise<void>;
  
  addLaundry: (item: Omit<LaundryItem, 'id' | 'lastUpdated'>) => Promise<void>;
  moveLaundry: (itemId: string, stage: LaundryStage) => Promise<void>;
  
  addInventory: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventory: (id: string, qty: number) => Promise<void>;
  
  checkIn: (guest: Omit<Guest, 'id'>) => Promise<void>;
  checkOut: (guestId: string) => Promise<void>;
  
  addAnnouncement: (content: string, priority: 'low' | 'normal' | 'high') => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      rooms: [],
      tasks: [],
      laundry: [],
      guests: [],
      inventory: [],
      announcements: [],
      transactions: [],
      isSupabaseConnected: false,
      isInitialLoading: true,
      connectionError: null,

      checkConnection: async () => {
        if (!supabase) {
          set({ isSupabaseConnected: false, connectionError: 'Chaves do Supabase ausentes' });
          return;
        }
        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          set({ isSupabaseConnected: !error, connectionError: error?.message || null });
        } catch (e: any) { 
          set({ isSupabaseConnected: false, connectionError: e.message }); 
        }
      },

      subscribeToChanges: () => {
        if (!supabase) return () => {};
        try {
          const channel = supabase.channel('global-sync')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
              get().syncData();
            })
            .subscribe();
          return () => { supabase.removeChannel(channel); };
        } catch {
          return () => {};
        }
      },

      syncData: async () => {
        if (!supabase) {
          set({ isInitialLoading: false });
          return;
        }
        
        try {
          const fetchSafely = async (table: string, options: any = {}) => {
            try {
              let query = supabase!.from(table).select('*');
              if (options.order) query = query.order(options.order, { ascending: options.asc ?? false });
              if (options.limit) query = query.limit(options.limit);
              const { data, error } = await query;
              if (error) throw error;
              return data || [];
            } catch (err) {
              console.warn(`Erro na tabela ${table}:`, err);
              return [];
            }
          };

          const [uData, rData, tData, iData, gData, aData, trData, lData] = await Promise.all([
            fetchSafely('users'),
            fetchSafely('rooms', { order: 'number', asc: true }),
            fetchSafely('tasks', { order: 'id', limit: 50 }),
            fetchSafely('inventory'),
            supabase!.from('guests').select('*').is('checked_out_at', null),
            fetchSafely('announcements', { order: 'created_at', limit: 20 }),
            fetchSafely('transactions', { order: 'date', limit: 50 }),
            fetchSafely('laundry')
          ]);

          // Mapeamento resiliente
          set({
            users: uData.map((x: any) => ({ id: x.id, email: x.email, fullName: x.full_name, role: x.role, password: x.password })),
            rooms: (rData as any[]).map((x: any) => ({ 
              id: x.id, number: x.number, floor: x.floor, status: x.status, category: x.category, 
              type: x.type || 'standard', maxGuests: x.max_guests || 2, bedsCount: x.beds_count || 1, 
              hasMinibar: !!x.has_minibar, hasBalcony: !!x.has_balcony, icalUrl: x.ical_url 
            })),
            laundry: (lData as any[]).map((x: any) => ({ 
              id: x.id, type: x.type, quantity: x.quantity, stage: x.stage, 
              roomOrigin: x.room_origin, lastUpdated: x.last_updated 
            })),
            tasks: (tData as any[]).map((x: any) => ({ 
              id: x.id, roomId: x.room_id, assignedTo: x.assigned_to, assignedByName: x.assigned_by_name, 
              status: x.status, startedAt: x.started_at, completedAt: x.completed_at, 
              durationMinutes: x.duration_minutes, deadline: x.deadline, notes: x.notes, 
              checklist: x.checklist || {}, photos: x.photos || [], 
              fatorMamaeVerified: !!x.fator_mamae_verified, bedsToMake: x.beds_to_make || 0 
            })),
            inventory: (iData as any[]).map((x: any) => ({ 
              id: x.id, name: x.name, category: x.category, quantity: x.quantity, 
              minStock: x.min_stock, price: Number(x.price) || 0, unitCost: Number(x.unit_cost) || 0 
            })),
            guests: (gData.data || []).map((x: any) => ({ 
              id: x.id, fullName: x.full_name, document: x.document, checkIn: x.check_in, 
              checkOut: x.check_out, roomId: x.room_id, dailyRate: Number(x.daily_rate), 
              totalValue: Number(x.total_value), paymentMethod: x.payment_method 
            })),
            announcements: (aData as any[]).map((x: any) => ({ 
              id: x.id, authorName: x.author_name, content: x.content, 
              priority: x.priority, createdAt: x.created_at 
            })),
            transactions: (trData as any[]).map((x: any) => ({ 
              id: x.id, date: x.date, type: x.type, category: x.category, 
              amount: Number(x.amount), description: x.description 
            })),
            isInitialLoading: false,
            isSupabaseConnected: true
          });
        } catch (e) {
          console.error("Crash na sincronização:", e);
          set({ isInitialLoading: false });
        }
      },

      login: async (email, password) => {
        if (!supabase) {
          // Fallback offline caso as chaves não estejam configuradas
          if (email === 'admin@admin.com' && password === 'admin') {
            set({ currentUser: { id: 'offline-admin', email, fullName: 'Administrador Local', role: UserRole.ADMIN } });
            return true;
          }
          return false;
        }
        try {
          const { data, error } = await supabase.from('users')
            .select('*')
            .ilike('email', email.trim())
            .eq('password', password?.trim())
            .maybeSingle();

          if (data && !error) {
            set({ currentUser: { id: data.id, email: data.email, fullName: data.full_name, role: data.role as UserRole, password: data.password } });
            await get().syncData();
            return true;
          }
        } catch (e) {
          console.error("Login Error:", e);
          return false;
        }
        return false;
      },

      logout: () => {
        set({ currentUser: null });
        localStorage.removeItem('hospedapro-session-prod');
      },

      uploadPhoto: async (file, path) => {
        if (!supabase) return null;
        try {
          const { data, error } = await supabase.storage.from('cleaning-photos').upload(path, file, { upsert: true, contentType: 'image/jpeg' });
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('cleaning-photos').getPublicUrl(data.path);
          return publicUrl;
        } catch (e) {
          console.error("Upload Error:", e);
          return null;
        }
      },

      updateTask: async (taskId, updates) => {
        if (!supabase) return;
        const dbFields: any = {};
        if (updates.status) dbFields.status = updates.status;
        if (updates.checklist) dbFields.checklist = updates.checklist;
        if (updates.photos) dbFields.photos = updates.photos;
        if (updates.startedAt) dbFields.started_at = updates.startedAt;
        if (updates.completedAt) dbFields.completed_at = updates.completedAt;
        if (updates.durationMinutes) dbFields.duration_minutes = updates.durationMinutes;
        if (updates.fatorMamaeVerified !== undefined) dbFields.fator_mamae_verified = updates.fatorMamaeVerified;
        
        try {
          await supabase.from('tasks').update(dbFields).eq('id', taskId);
          await get().syncData();
        } catch {}
      },

      approveTask: async (taskId) => {
        if (!supabase) return;
        try {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) return;
          await supabase.from('tasks').update({ status: 'aprovado' }).eq('id', taskId);
          await supabase.from('rooms').update({ status: 'disponivel' }).eq('id', task.roomId);
          await get().syncData();
        } catch {}
      },

      updateRoomStatus: async (id, status) => {
        if (!supabase) return;
        try {
          await supabase.from('rooms').update({ status }).eq('id', id);
          await get().syncData();
        } catch {}
      },

      addLaundry: async (item) => {
        if (!supabase) return;
        try {
          await supabase.from('laundry').insert({
            id: `l-${Date.now()}`, type: item.type, quantity: item.quantity, 
            stage: item.stage, room_origin: item.roomOrigin, last_updated: new Date().toISOString()
          });
          await get().syncData();
        } catch {}
      },

      moveLaundry: async (id, stage) => {
        if (!supabase) return;
        try {
          await supabase.from('laundry').update({ stage, last_updated: new Date().toISOString() }).eq('id', id);
          await get().syncData();
        } catch {}
      },

      updateInventory: async (id, qty) => {
        if (!supabase) return;
        try {
          const item = get().inventory.find(i => i.id === id);
          if (item) {
            await supabase.from('inventory').update({ quantity: Math.max(0, item.quantity + qty) }).eq('id', id);
            await get().syncData();
          }
        } catch {}
      },

      checkIn: async (data) => {
        if (!supabase) return;
        try {
          await supabase.from('guests').insert({
            id: `g-${Date.now()}`, full_name: data.fullName, document: data.document,
            check_in: data.checkIn, check_out: data.checkOut, room_id: data.roomId,
            daily_rate: data.dailyRate, total_value: data.totalValue, payment_method: data.payment_method
          });
          await supabase.from('rooms').update({ status: 'ocupado' }).eq('id', data.roomId);
          await get().syncData();
        } catch {}
      },

      checkOut: async (id) => {
        if (!supabase) return;
        try {
          const guest = get().guests.find(g => g.id === id);
          if (!guest) return;
          await supabase.from('guests').update({ checked_out_at: new Date().toISOString() }).eq('id', id);
          await supabase.from('rooms').update({ status: 'sujo' }).eq('id', guest.roomId);
          await get().syncData();
        } catch {}
      },

      addUser: async (u) => {
        if (!supabase) return;
        try {
          await supabase.from('users').insert({ id: `u-${Date.now()}`, email: u.email, full_name: u.fullName, role: u.role, password: u.password });
          await get().syncData();
        } catch {}
      },

      removeUser: async (id) => {
        if (!supabase) return;
        try {
          await supabase.from('users').delete().eq('id', id);
          await get().syncData();
        } catch {}
      },

      updateCurrentUser: (u) => set(s => ({ currentUser: s.currentUser ? { ...s.currentUser, ...u } : null })),
      updateUserPassword: async (id, p) => { if (supabase) await supabase.from('users').update({ password: p }).eq('id', id); get().syncData(); },
      addAnnouncement: async (c, p) => { if (supabase) await supabase.from('announcements').insert({ id: `a-${Date.now()}`, author_name: get().currentUser?.fullName, content: c, priority: p }); get().syncData(); },
      addTransaction: async (d) => { if (supabase) await supabase.from('transactions').insert({ id: `tr-${Date.now()}`, ...d, date: new Date().toISOString() }); get().syncData(); },
      updateRoomICal: async (id, url) => { if (supabase) await supabase.from('rooms').update({ ical_url: url }).eq('id', id); get().syncData(); },
      syncICal: async () => get().syncData(),
      createTask: async (data) => {
        if (!supabase) return;
        try {
          const id = `t-${Date.now()}`;
          const room = get().rooms.find(r => r.id === data.roomId);
          const template = CHECKLIST_TEMPLATES[room?.id!] || CHECKLIST_TEMPLATES[room?.category!] || CHECKLIST_TEMPLATES[RoomCategory.GUEST_ROOM];
          await supabase.from('tasks').insert({
            id, room_id: data.roomId, assigned_to: data.assignedTo,
            assigned_by_name: get().currentUser?.fullName || 'Gerente',
            status: 'pendente', deadline: data.deadline, notes: data.notes,
            checklist: template.reduce((acc, cur) => ({ ...acc, [cur]: false }), {})
          });
          await supabase.from('rooms').update({ status: 'limpando' }).eq('id', data.roomId);
          await get().syncData();
        } catch {}
      },
      addInventory: async (item) => {
        if (!supabase) return;
        try {
          await supabase.from('inventory').insert({ id: `i-${Date.now()}`, name: item.name, category: item.category, quantity: item.quantity, min_stock: item.minStock, unit_cost: item.unitCost });
          await get().syncData();
        } catch {}
      },
    }),
    {
      name: 'hospedapro-session-prod',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
