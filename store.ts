
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction, PaymentMethod
} from './types';
import { CHECKLIST_TEMPLATES } from './constants';

const getEnv = (key: string) => {
  try {
    return (window.process?.env as any)?.[key] || '';
  } catch {
    return '';
  }
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
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
          set({ isSupabaseConnected: false, connectionError: 'Credenciais ausentes' });
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
          const channel = supabase.channel('realtime-sync')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => get().syncData())
            .subscribe();
          return () => { supabase.removeChannel(channel); };
        } catch { return () => {}; }
      },

      syncData: async () => {
        if (!supabase) { set({ isInitialLoading: false }); return; }
        try {
          const [u, r, t, i, g, a, tr, l] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('rooms').select('*').order('number'),
            supabase.from('tasks').select('*').order('id', { ascending: false }).limit(100),
            supabase.from('inventory').select('*'),
            supabase.from('guests').select('*').is('checked_out_at', null),
            supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20),
            supabase.from('transactions').select('*').order('date', { ascending: false }).limit(50),
            supabase.from('laundry').select('*').order('last_updated', { ascending: false })
          ]);

          if (u.data) set({ users: u.data.map(x => ({ id: x.id, email: x.email, fullName: x.full_name, role: x.role, password: x.password })) });
          if (r.data) set({ rooms: r.data.map(x => ({ id: x.id, number: x.number, floor: x.floor, status: x.status, category: x.category, type: x.type || 'standard', maxGuests: x.max_guests || 2, bedsCount: x.beds_count || 1, hasMinibar: !!x.has_minibar, hasBalcony: !!x.has_balcony, icalUrl: x.ical_url })) });
          if (l.data) set({ laundry: l.data.map(x => ({ id: x.id, type: x.type, quantity: x.quantity, stage: x.stage, roomOrigin: x.room_origin, lastUpdated: x.last_updated })) });
          if (t.data) set({ tasks: t.data.map(x => ({ id: x.id, roomId: x.room_id, assignedTo: x.assigned_to, assignedByName: x.assigned_by_name, status: x.status, startedAt: x.started_at, completedAt: x.completed_at, durationMinutes: x.duration_minutes, deadline: x.deadline, notes: x.notes, checklist: x.checklist || {}, photos: x.photos || [], fatorMamaeVerified: !!x.fator_mamae_verified, bedsToMake: x.beds_to_make || 0 })) });
          if (i.data) set({ inventory: i.data.map(x => ({ id: x.id, name: x.name, category: x.category, quantity: x.quantity, minStock: x.min_stock, price: x.price || 0, unitCost: x.unit_cost || 0 })) });
          if (g.data) set({ guests: g.data.map(x => ({ id: x.id, fullName: x.full_name, document: x.document, checkIn: x.check_in, checkOut: x.check_out, roomId: x.room_id, dailyRate: x.daily_rate, totalValue: x.total_value, paymentMethod: x.payment_method })) });
          if (a.data) set({ announcements: a.data.map(x => ({ id: x.id, authorName: x.author_name, content: x.content, priority: x.priority, createdAt: x.created_at })) });
          if (tr.data) set({ transactions: tr.data.map(x => ({ id: x.id, date: x.date, type: x.type, category: x.category, amount: x.amount, description: x.description })) });

          set({ isInitialLoading: false });
        } catch (e) {
          console.error("Erro Sync:", e);
          set({ isInitialLoading: false });
        }
      },

      login: async (email, password) => {
        if (!supabase) {
          if (email === 'admin@admin.com' && password === 'admin') {
            set({ currentUser: { id: 'offline', email, fullName: 'Admin Offline', role: UserRole.ADMIN }, isInitialLoading: false });
            return true;
          }
          return false;
        }
        const { data, error } = await supabase.from('users').select('*').ilike('email', email.trim()).eq('password', password?.trim()).maybeSingle();
        if (data && !error) {
          set({ currentUser: { id: data.id, email: data.email, fullName: data.full_name, role: data.role as UserRole, password: data.password } });
          await get().syncData();
          return true;
        }
        return false;
      },

      uploadPhoto: async (file, path) => {
        if (!supabase) return null;
        try {
          const { data, error } = await supabase.storage.from('cleaning-photos').upload(path, file, { upsert: true, contentType: 'image/jpeg' });
          if (error) return null;
          const { data: { publicUrl } } = supabase.storage.from('cleaning-photos').getPublicUrl(data.path);
          return publicUrl;
        } catch { return null; }
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
        
        await supabase.from('tasks').update(dbFields).eq('id', taskId);
        await get().syncData();
      },

      approveTask: async (taskId) => {
        if (!supabase) return;
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;
        await supabase.from('tasks').update({ status: 'aprovado' }).eq('id', taskId);
        await supabase.from('rooms').update({ status: 'disponivel' }).eq('id', task.roomId);
        await get().syncData();
      },

      updateRoomStatus: async (id, status) => {
        if (!supabase) return;
        await supabase.from('rooms').update({ status }).eq('id', id);
        await get().syncData();
      },

      addLaundry: async (item) => {
        if (!supabase) return;
        await supabase.from('laundry').insert({
          id: `l-${Date.now()}`, type: item.type, quantity: item.quantity, 
          stage: item.stage, room_origin: item.roomOrigin, last_updated: new Date().toISOString()
        });
        await get().syncData();
      },

      moveLaundry: async (id, stage) => {
        if (!supabase) return;
        await supabase.from('laundry').update({ stage, last_updated: new Date().toISOString() }).eq('id', id);
        await get().syncData();
      },

      updateInventory: async (id, qty) => {
        if (!supabase) return;
        const item = get().inventory.find(i => i.id === id);
        if (item) {
          await supabase.from('inventory').update({ quantity: Math.max(0, item.quantity + qty) }).eq('id', id);
          await get().syncData();
        }
      },

      checkIn: async (data) => {
        if (!supabase) return;
        await supabase.from('guests').insert({
          id: `g-${Date.now()}`, full_name: data.fullName, document: data.document,
          check_in: data.checkIn, check_out: data.checkOut, room_id: data.roomId,
          daily_rate: data.dailyRate, total_value: data.totalValue, payment_method: data.paymentMethod
        });
        await supabase.from('rooms').update({ status: 'ocupado' }).eq('id', data.roomId);
        await get().syncData();
      },

      checkOut: async (id) => {
        if (!supabase) return;
        const guest = get().guests.find(g => g.id === id);
        if (!guest) return;
        await supabase.from('guests').update({ checked_out_at: new Date().toISOString() }).eq('id', id);
        await supabase.from('rooms').update({ status: 'sujo' }).eq('id', guest.roomId);
        await get().syncData();
      },

      addUser: async (u) => {
        if (!supabase) return;
        await supabase.from('users').insert({ id: `u-${Date.now()}`, email: u.email, full_name: u.fullName, role: u.role, password: u.password });
        await get().syncData();
      },

      removeUser: async (id) => {
        if (!supabase) return;
        await supabase.from('users').delete().eq('id', id);
        await get().syncData();
      },

      logout: () => set({ currentUser: null }),
      updateCurrentUser: (u) => set(s => ({ currentUser: s.currentUser ? { ...s.currentUser, ...u } : null })),
      updateUserPassword: async (id, p) => { if (supabase) await supabase.from('users').update({ password: p }).eq('id', id); get().syncData(); },
      addAnnouncement: async (c, p) => { if (supabase) await supabase.from('announcements').insert({ id: `a-${Date.now()}`, author_name: get().currentUser?.fullName, content: c, priority: p }); get().syncData(); },
      addTransaction: async (d) => { if (supabase) await supabase.from('transactions').insert({ id: `tr-${Date.now()}`, ...d, date: new Date().toISOString() }); get().syncData(); },
      updateRoomICal: async (id, url) => { if (supabase) await supabase.from('rooms').update({ ical_url: url }).eq('id', id); get().syncData(); },
      syncICal: async () => get().syncData(),
      createTask: async (data) => {
        if (!supabase) return;
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
      },
      addInventory: async (item) => {
        if (!supabase) return;
        await supabase.from('inventory').insert({ id: `i-${Date.now()}`, name: item.name, category: item.category, quantity: item.quantity, min_stock: item.minStock, unit_cost: item.unitCost });
        await get().syncData();
      },
    }),
    {
      name: 'hospedapro-vfinal-prod',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
