
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction, PaymentMethod
} from './types';
import { CHECKLIST_TEMPLATES } from './constants';

const SUPABASE_URL = process.env.SUPABASE_URL || (window as any).process?.env?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || (window as any).process?.env?.SUPABASE_ANON_KEY || "";

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
  
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  syncData: () => Promise<void>;
  forceDemoLogin: () => void;
  checkConnection: () => Promise<void>;
  subscribeToChanges: () => () => void;

  // Actions
  updateRoomStatus: (id: string, status: RoomStatus) => Promise<void>;
  createTask: (data: any) => Promise<void>;
  updateTask: (id: string, updates: any) => Promise<void>;
  approveTask: (id: string) => Promise<void>;
  checkIn: (data: any) => Promise<void>;
  checkOut: (id: string) => Promise<void>;
  addAnnouncement: (content: string, priority: any) => Promise<void>;
  addTransaction: (data: any) => Promise<void>;
  addLaundry: (item: any) => Promise<void>;
  moveLaundry: (id: string, stage: LaundryStage) => Promise<void>;
  updateInventory: (id: string, qty: number) => Promise<void>;
  addUser: (u: any) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  updateCurrentUser: (u: Partial<User>) => void;
  updateUserPassword: (id: string, p: string) => Promise<void>;
  uploadPhoto: (file: Blob, path: string) => Promise<string | null>;
  updateRoomICal: (id: string, url: string) => Promise<void>;
  syncICal: (id: string) => Promise<void>;
  addInventory: (item: any) => Promise<void>;
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
      isSupabaseConnected: !!supabase,
      isInitialLoading: false,

      forceDemoLogin: () => {
        set({ 
          currentUser: { id: 'demo', email: 'gerente@hospedapro.com', fullName: 'Gerente Demo', role: UserRole.MANAGER },
          isInitialLoading: false 
        });
        get().syncData();
      },

      checkConnection: async () => {
        if (!supabase) return;
        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          set({ isSupabaseConnected: !error });
        } catch { set({ isSupabaseConnected: false }); }
      },

      subscribeToChanges: () => {
        if (!supabase) return () => {};
        const channel = supabase.channel('db-changes')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => get().syncData())
          .subscribe();
        return () => supabase.removeChannel(channel);
      },

      syncData: async () => {
        if (!supabase) return;
        set({ isInitialLoading: true });
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
            users: (u.data || []).map(x => ({ id: x.id, email: x.email, fullName: x.full_name, role: x.role as UserRole, password: x.password })),
            rooms: (r.data || []).map(x => ({ 
              id: x.id, number: x.number, floor: x.floor, type: x.type as RoomType,
              category: x.category as RoomCategory, status: x.status as RoomStatus,
              maxGuests: x.max_guests, bedsCount: x.beds_count, hasMinibar: x.has_minibar,
              hasBalcony: x.has_balcony, icalUrl: x.ical_url 
            })),
            tasks: (t.data || []).map(x => ({ 
              id: x.id, roomId: x.room_id, assignedTo: x.assigned_to, assignedByName: x.assigned_by_name,
              status: x.status as CleaningStatus, startedAt: x.started_at, completedAt: x.completed_at,
              durationMinutes: x.duration_minutes, deadline: x.deadline, notes: x.notes,
              checklist: x.checklist || {}, photos: x.photos || [], fatorMamaeVerified: x.fator_mamae_verified,
              bedsToMake: x.beds_to_make || 0
            })),
            inventory: (i.data || []).map(x => ({ id: x.id, name: x.name, category: x.category, quantity: x.quantity, minStock: x.min_stock, unitCost: x.unit_cost, price: x.price })),
            guests: (g.data || []).map(x => ({ id: x.id, fullName: x.full_name, document: x.document, checkIn: x.check_in, checkOut: x.check_out, roomId: x.room_id, dailyRate: x.daily_rate, totalValue: x.total_value, paymentMethod: x.payment_method as PaymentMethod, checkedOutAt: x.checked_out_at })),
            announcements: (a.data || []).map(x => ({ id: x.id, authorName: x.author_name, content: x.content, createdAt: x.created_at, priority: x.priority })),
            transactions: (tr.data || []),
            laundry: (l.data || []).map(x => ({ id: x.id, type: x.type, quantity: x.quantity, stage: x.stage as LaundryStage, roomOrigin: x.room_origin, lastUpdated: x.last_updated })),
            isInitialLoading: false
          });
        } catch (e) { 
          console.error("Sync Error:", e);
          set({ isInitialLoading: false }); 
        }
      },

      login: async (email, password) => {
        if (!supabase) return false;
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('email', email.trim())
            .eq('password', password)
            .maybeSingle();

          if (error || !data) return false;

          set({ currentUser: { id: data.id, email: data.email, fullName: data.full_name, role: data.role as UserRole, password: data.password } });
          await get().syncData();
          return true;
        } catch { return false; }
      },

      logout: () => set({ currentUser: null }),

      uploadPhoto: async (file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      },

      updateRoomStatus: async (id, status) => {
        if (supabase) await supabase.from('rooms').update({ status }).eq('id', id);
        get().syncData();
      },

      createTask: async (data) => {
        if (!supabase) return;
        const room = get().rooms.find(r => r.id === data.roomId);
        const template = CHECKLIST_TEMPLATES[room?.id!] || CHECKLIST_TEMPLATES[room?.category!] || CHECKLIST_TEMPLATES[RoomCategory.GUEST_ROOM];
        await supabase.from('tasks').insert({
          room_id: data.roomId,
          assigned_to: data.assignedTo,
          assigned_by_name: get().currentUser?.fullName,
          status: 'pendente',
          deadline: data.deadline,
          notes: data.notes,
          checklist: template.reduce((acc, cur) => ({ ...acc, [cur]: false }), {})
        });
        await supabase.from('rooms').update({ status: 'limpando' }).eq('id', data.roomId);
        get().syncData();
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

      checkIn: async (data) => {
        if (!supabase) return;
        await supabase.from('guests').insert({
          full_name: data.fullName,
          document: data.document,
          check_in: data.checkIn,
          check_out: data.checkOut,
          room_id: data.roomId,
          daily_rate: data.dailyRate,
          total_value: data.totalValue,
          payment_method: data.paymentMethod
        });
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

      addAnnouncement: async (c, p) => {
        if (supabase) await supabase.from('announcements').insert({ author_name: get().currentUser?.fullName, content: c, priority: p });
        get().syncData();
      },

      addTransaction: async (d) => {
        if (supabase) await supabase.from('transactions').insert(d);
        get().syncData();
      },

      addLaundry: async (item) => {
        if (supabase) await supabase.from('laundry').insert({ type: item.type, quantity: item.quantity, stage: item.stage, room_origin: item.roomOrigin, last_updated: new Date().toISOString() });
        get().syncData();
      },

      moveLaundry: async (id, stage) => {
        if (supabase) await supabase.from('laundry').update({ stage, last_updated: new Date().toISOString() }).eq('id', id);
        get().syncData();
      },

      updateInventory: async (id, qty) => {
        const item = get().inventory.find(i => i.id === id);
        if (item && supabase) await supabase.from('inventory').update({ quantity: item.quantity + qty }).eq('id', id);
        get().syncData();
      },

      addInventory: async (item) => {
        if (supabase) await supabase.from('inventory').insert(item);
        get().syncData();
      },

      addUser: async (u) => { if (supabase) await supabase.from('users').insert({ full_name: u.fullName, email: u.email, password: u.password, role: u.role }); get().syncData(); },
      removeUser: async (id) => { if (supabase) await supabase.from('users').delete().eq('id', id); get().syncData(); },
      updateCurrentUser: (u) => set(s => ({ currentUser: s.currentUser ? { ...s.currentUser, ...u } : null })),
      updateUserPassword: async (id, p) => { if (supabase) await supabase.from('users').update({ password: p }).eq('id', id); get().syncData(); },
      updateRoomICal: async (id, url) => { if (supabase) await supabase.from('rooms').update({ ical_url: url }).eq('id', id); get().syncData(); },
      syncICal: async (id) => get().syncData(),
    }),
    {
      name: 'hospedapro-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
