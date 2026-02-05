
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction, PaymentMethod
} from './types';
import { CHECKLIST_TEMPLATES } from './constants';

const SUPABASE_URL = (window.process?.env as any)?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (window.process?.env as any)?.SUPABASE_ANON_KEY || '';

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
          set({ isSupabaseConnected: false });
          return;
        }
        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          set({ isSupabaseConnected: !error });
        } catch { set({ isSupabaseConnected: false }); }
      },

      subscribeToChanges: () => {
        if (!supabase) return () => {};
        const channel = supabase.channel('global-sync')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => get().syncData())
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      },

      syncData: async () => {
        if (!supabase) {
          set({ isInitialLoading: false });
          return;
        }
        try {
          const [u, r, t, i, g, a, tr, l] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('rooms').select('*').order('number'),
            supabase.from('tasks').select('*').order('id', { ascending: false }).limit(50),
            supabase.from('inventory').select('*'),
            supabase.from('guests').select('*').is('checked_out_at', null),
            supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(10),
            supabase.from('transactions').select('*').order('date', { ascending: false }).limit(20),
            supabase.from('laundry').select('*')
          ]);

          set({
            users: (u.data || []).map(x => ({ id: x.id, email: x.email, fullName: x.full_name, role: x.role, password: x.password })),
            rooms: (r.data || []).map(x => ({ ...x, bedsCount: x.beds_count, hasMinibar: x.has_minibar, hasBalcony: x.has_balcony, icalUrl: x.ical_url })),
            // FIX: Added missing bedsToMake property to satisfy CleaningTask interface
            tasks: (t.data || []).map(x => ({ 
              id: x.id, 
              roomId: x.room_id, 
              assignedTo: x.assigned_to, 
              assignedByName: x.assigned_by_name, 
              status: x.status, 
              startedAt: x.started_at, 
              completedAt: x.completed_at, 
              durationMinutes: x.duration_minutes, 
              deadline: x.deadline, 
              notes: x.notes, 
              checklist: x.checklist || {}, 
              photos: x.photos || [], 
              fatorMamaeVerified: x.fator_mamae_verified,
              bedsToMake: x.beds_to_make || 0
            })),
            inventory: (i.data || []).map(x => ({ ...x, minStock: x.min_stock, unitCost: x.unit_cost })),
            guests: (g.data || []).map(x => ({ id: x.id, fullName: x.full_name, document: x.document, checkIn: x.check_in, checkOut: x.check_out, roomId: x.room_id, dailyRate: x.daily_rate, totalValue: x.total_value, paymentMethod: x.payment_method })),
            announcements: (a.data || []).map(x => ({ ...x, authorName: x.author_name, createdAt: x.created_at })),
            transactions: (tr.data || []),
            laundry: (l.data || []).map(x => ({ ...x, roomOrigin: x.room_origin, lastUpdated: x.last_updated })),
            isInitialLoading: false,
            isSupabaseConnected: true
          });
        } catch { set({ isInitialLoading: false }); }
      },

      login: async (email, password) => {
        if (!supabase) return false;
        const { data } = await supabase.from('users').select('*').ilike('email', email.trim()).eq('password', password).maybeSingle();
        if (data) {
          set({ currentUser: { id: data.id, email: data.email, fullName: data.full_name, role: data.role as UserRole, password: data.password } });
          get().syncData();
          return true;
        }
        return false;
      },

      logout: () => set({ currentUser: null }),

      uploadPhoto: async (file) => {
        // Fallback para base64 para evitar erros de permissão de Storage
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      },

      updateTask: async (id, updates) => {
        if (!supabase) return;
        const dbFields: any = {};
        if (updates.status) dbFields.status = updates.status;
        if (updates.checklist) dbFields.checklist = updates.checklist;
        if (updates.photos) dbFields.photos = updates.photos;
        if (updates.startedAt) dbFields.started_at = updates.startedAt;
        if (updates.completedAt) dbFields.completed_at = updates.completedAt;
        if (updates.durationMinutes) dbFields.duration_minutes = updates.durationMinutes;
        if (updates.fatorMamaeVerified !== undefined) dbFields.fator_mamae_verified = updates.fatorMamaeVerified;
        await supabase.from('tasks').update(dbFields).eq('id', id);
        get().syncData();
      },

      approveTask: async (id) => {
        if (!supabase) return;
        const task = get().tasks.find(t => t.id === id);
        if (task) {
          await supabase.from('tasks').update({ status: 'aprovado' }).eq('id', id);
          await supabase.from('rooms').update({ status: 'disponivel' }).eq('id', task.roomId);
          get().syncData();
        }
      },

      updateRoomStatus: async (id, status) => {
        if (supabase) await supabase.from('rooms').update({ status }).eq('id', id);
        get().syncData();
      },

      addLaundry: async (item) => {
        if (supabase) await supabase.from('laundry').insert({ id: `l-${Date.now()}`, ...item, room_origin: item.roomOrigin, last_updated: new Date().toISOString() });
        get().syncData();
      },

      moveLaundry: async (id, stage) => {
        if (supabase) await supabase.from('laundry').update({ stage, last_updated: new Date().toISOString() }).eq('id', id);
        get().syncData();
      },

      updateInventory: async (id, qty) => {
        if (!supabase) return;
        const item = get().inventory.find(i => i.id === id);
        if (item) {
          await supabase.from('inventory').update({ quantity: Math.max(0, item.quantity + qty) }).eq('id', id);
          get().syncData();
        }
      },

      checkIn: async (data) => {
        if (!supabase) return;
        await supabase.from('guests').insert({ id: `g-${Date.now()}`, full_name: data.fullName, ...data, room_id: data.roomId, daily_rate: data.dailyRate, total_value: data.totalValue, payment_method: data.paymentMethod });
        await supabase.from('rooms').update({ status: 'ocupado' }).eq('id', data.roomId);
        get().syncData();
      },

      checkOut: async (id) => {
        if (!supabase) return;
        const guest = get().guests.find(g => g.id === id);
        if (guest) {
          await supabase.from('guests').update({ checked_out_at: new Date().toISOString() }).eq('id', id);
          await supabase.from('rooms').update({ status: 'sujo' }).eq('id', guest.roomId);
          get().syncData();
        }
      },

      addUser: async (u) => { if (supabase) await supabase.from('users').insert({ id: `u-${Date.now()}`, full_name: u.fullName, ...u }); get().syncData(); },
      removeUser: async (id) => { if (supabase) await supabase.from('users').delete().eq('id', id); get().syncData(); },
      updateCurrentUser: (u) => set(s => ({ currentUser: s.currentUser ? { ...s.currentUser, ...u } : null })),
      updateUserPassword: async (id, p) => { if (supabase) await supabase.from('users').update({ password: p }).eq('id', id); get().syncData(); },
      addAnnouncement: async (c, p) => { if (supabase) await supabase.from('announcements').insert({ id: `a-${Date.now()}`, author_name: get().currentUser?.fullName, content: c, priority: p }); get().syncData(); },
      addTransaction: async (d) => { if (supabase) await supabase.from('transactions').insert({ id: `tr-${Date.now()}`, ...d }); get().syncData(); },
      updateRoomICal: async (id, url) => { if (supabase) await supabase.from('rooms').update({ ical_url: url }).eq('id', id); get().syncData(); },
      syncICal: async () => get().syncData(),
      createTask: async (data) => {
        if (!supabase) return;
        const id = `t-${Date.now()}`;
        const room = get().rooms.find(r => r.id === data.roomId);
        const template = CHECKLIST_TEMPLATES[room?.id!] || CHECKLIST_TEMPLATES[room?.category!] || CHECKLIST_TEMPLATES[RoomCategory.GUEST_ROOM];
        await supabase.from('tasks').insert({ id, room_id: data.roomId, assigned_to: data.assignedTo, assigned_by_name: get().currentUser?.fullName, status: 'pendente', deadline: data.deadline, notes: data.notes, checklist: template.reduce((acc, cur) => ({ ...acc, [cur]: false }), {}) });
        await supabase.from('rooms').update({ status: 'limpando' }).eq('id', data.roomId);
        get().syncData();
      },
      addInventory: async (item) => { if (supabase) await supabase.from('inventory').insert({ id: `i-${Date.now()}`, ...item, min_stock: item.minStock, unit_cost: item.unitCost }); get().syncData(); },
    }),
    {
      name: 'hospedapro-stable-session',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
