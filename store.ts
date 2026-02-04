
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction, PaymentMethod
} from './types';
import { CHECKLIST_TEMPLATES } from './constants';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
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
  
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  syncData: () => Promise<void>;
  checkConnection: () => Promise<void>;
  
  // Ações de Negócio
  createTask: (data: Partial<CleaningTask>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<CleaningTask>) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  
  // Lavanderia (PERSISTENTE)
  addLaundry: (item: Omit<LaundryItem, 'id' | 'lastUpdated'>) => Promise<void>;
  moveLaundry: (itemId: string, stage: LaundryStage) => Promise<void>;
  
  // Estoque
  addInventory: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventory: (id: string, qty: number) => Promise<void>;
  
  // Hóspedes
  checkIn: (guest: Omit<Guest, 'id'>) => Promise<void>;
  checkOut: (guestId: string) => Promise<void>;
  
  // Financeiro e Mural
  addAnnouncement: (content: string, priority: 'low' | 'normal' | 'high') => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  
  // Gestão de Time
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

      checkConnection: async () => {
        if (!supabase) return;
        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          set({ isSupabaseConnected: !error });
          if (!error && get().currentUser) await get().syncData();
        } catch { set({ isSupabaseConnected: false }); }
      },

      syncData: async () => {
        if (!supabase) return;
        try {
          const [uRes, rRes, tRes, iRes, gRes, aRes, trRes, lRes] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('rooms').select('*'),
            supabase.from('tasks').select('*').not('status', 'eq', 'aprovado'),
            supabase.from('inventory').select('*'),
            supabase.from('guests').select('*').is('checked_out_at', null),
            supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20),
            supabase.from('transactions').select('*').order('date', { ascending: false }).limit(20),
            supabase.from('laundry').select('*').order('last_updated', { ascending: false })
          ]);

          if (uRes.data) {
            set({ users: uRes.data.map(u => ({ id: u.id, email: u.email, fullName: u.full_name, role: u.role as UserRole, password: u.password })) });
          }

          if (rRes.data) {
            set({ rooms: rRes.data.map(r => ({
              id: r.id, number: r.number, floor: r.floor, status: r.status as RoomStatus,
              category: r.category as RoomCategory, type: (r.type || 'standard') as RoomType,
              maxGuests: r.max_guests || 2, bedsCount: r.beds_count || 1, hasMinibar: !!r.has_minibar, hasBalcony: !!r.has_balcony
            })) });
          }

          if (lRes.data) {
            set({ laundry: lRes.data.map(l => ({
              id: l.id, type: l.type, quantity: l.quantity, stage: l.stage as LaundryStage,
              roomOrigin: l.room_origin, lastUpdated: l.last_updated
            })) });
          }

          if (tRes.data) {
            set({ tasks: tRes.data.map(t => ({
              id: t.id, roomId: t.room_id, assignedTo: t.assigned_to, assignedByName: t.assigned_by_name,
              status: t.status as CleaningStatus, startedAt: t.started_at, completedAt: t.completed_at,
              durationMinutes: t.duration_minutes, deadline: t.deadline, notes: t.notes,
              checklist: t.checklist || {}, photos: t.photos || [], fatorMamaeVerified: !!t.fator_mamae_verified,
              bedsToMake: t.beds_to_make || 0
            })) });
          }

          if (iRes.data) {
            set({ inventory: iRes.data.map(i => ({
              id: i.id, name: i.name, category: i.category, quantity: i.quantity,
              minStock: i.min_stock, price: i.price, unitCost: i.unit_cost
            })) });
          }

          if (gRes.data) {
            set({ guests: gRes.data.map(g => ({
              id: g.id, fullName: g.full_name, document: g.document, checkIn: g.check_in,
              checkOut: g.check_out, roomId: g.room_id, dailyRate: g.daily_rate,
              totalValue: g.total_value, paymentMethod: g.payment_method as PaymentMethod
            })) });
          }

          if (aRes.data) {
            set({ announcements: aRes.data.map(a => ({
              id: a.id, authorName: a.author_name, content: a.content, priority: a.priority as any, createdAt: a.created_at
            })) });
          }

          if (trRes.data) {
            set({ transactions: trRes.data.map(tr => ({
              id: tr.id, date: tr.date, type: tr.type as any, category: tr.category as any,
              amount: tr.amount, description: tr.description
            })) });
          }
        } catch (e) { console.error("Sync Error:", e); }
      },

      login: async (email, password) => {
        if (!supabase) return false;
        try {
          const { data, error } = await supabase.from('users').select('*')
            .ilike('email', email.trim())
            .eq('password', password?.trim())
            .maybeSingle();

          if (data && !error) {
            const user: User = { id: data.id, email: data.email, fullName: data.full_name, role: data.role as UserRole, password: data.password };
            set({ currentUser: user });
            await get().syncData();
            return true;
          }
        } catch (e) { console.error("Login Error:", e); }
        return false;
      },

      addLaundry: async (item) => {
        if (!supabase) return;
        const id = `l-${Date.now()}`;
        const lastUpdated = new Date().toISOString();
        const { error } = await supabase.from('laundry').insert({
          id, type: item.type, quantity: item.quantity, stage: item.stage,
          room_origin: item.roomOrigin, last_updated: lastUpdated
        });
        if (!error) await get().syncData();
      },

      moveLaundry: async (itemId, stage) => {
        if (!supabase) return;
        const { error } = await supabase.from('laundry').update({ 
          stage, 
          last_updated: new Date().toISOString() 
        }).eq('id', itemId);
        if (!error) await get().syncData();
      },

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

      updateTask: async (taskId, updates) => {
        if (!supabase) return;
        await supabase.from('tasks').update({
          status: updates.status, checklist: updates.checklist, photos: updates.photos,
          started_at: updates.startedAt, completed_at: updates.completedAt,
          duration_minutes: updates.durationMinutes, fator_mamae_verified: updates.fator_mamae_verified
        }).eq('id', taskId);
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

      updateRoomStatus: async (roomId, status) => {
        if (!supabase) return;
        await supabase.from('rooms').update({ status }).eq('id', roomId);
        await get().syncData();
      },

      addInventory: async (item) => {
        if (!supabase) return;
        const id = `i-${Date.now()}`;
        await supabase.from('inventory').insert({
          id, name: item.name, category: item.category, quantity: item.quantity,
          min_stock: item.minStock, unit_cost: item.unitCost
        });
        await get().syncData();
      },

      updateInventory: async (id, qty) => {
        if (!supabase) return;
        const item = get().inventory.find(i => i.id === id);
        if (item) {
          const newQty = Math.max(0, item.quantity + qty);
          await supabase.from('inventory').update({ quantity: newQty }).eq('id', id);
          await get().syncData();
        }
      },

      checkIn: async (data) => {
        if (!supabase) return;
        const id = `g-${Date.now()}`;
        await supabase.from('guests').insert({
          id, full_name: data.fullName, document: data.document, check_in: data.checkIn,
          check_out: data.checkOut, room_id: data.roomId, daily_rate: data.dailyRate,
          total_value: data.totalValue, payment_method: data.paymentMethod
        });
        await supabase.from('rooms').update({ status: 'ocupado' }).eq('id', data.roomId);
        await get().syncData();
      },

      checkOut: async (guestId) => {
        if (!supabase) return;
        const guest = get().guests.find(g => g.id === guestId);
        if (!guest) return;
        await supabase.from('guests').update({ checked_out_at: new Date().toISOString() }).eq('id', guestId);
        await supabase.from('rooms').update({ status: 'sujo' }).eq('id', guest.roomId);
        await get().syncData();
      },

      addAnnouncement: async (content, priority) => {
        if (!supabase) return;
        await supabase.from('announcements').insert({
          id: `a-${Date.now()}`, author_name: get().currentUser?.fullName,
          content, priority
        });
        await get().syncData();
      },

      addTransaction: async (data) => {
        if (!supabase) return;
        await supabase.from('transactions').insert({
          id: `tr-${Date.now()}`, type: data.type, category: data.category,
          amount: data.amount, description: data.description
        });
        await get().syncData();
      },

      addUser: async (userData) => {
        if (!supabase) return;
        await supabase.from('users').insert({
          id: `u-${Date.now()}`, email: userData.email, full_name: userData.fullName,
          role: userData.role, password: userData.password
        });
        await get().syncData();
      },

      removeUser: async (id) => {
        if (!supabase) return;
        await supabase.from('users').delete().eq('id', id);
        await get().syncData();
      },

      logout: () => set({ currentUser: null }),
    }),
    {
      name: 'hospedapro-v4-real',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
