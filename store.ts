
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
  
  // Helpers
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
          const [uRes, rRes, tRes] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('rooms').select('*'),
            supabase.from('tasks').select('*').not('status', 'eq', 'aprovado')
          ]);

          if (uRes.data) {
            set({ users: uRes.data.map(u => ({
              id: u.id, email: u.email, fullName: u.full_name, role: u.role as UserRole, password: u.password
            })) });
          }

          if (rRes.data) {
            set({ rooms: rRes.data.map(r => ({
              id: r.id, number: r.number, floor: r.floor, status: r.status as RoomStatus,
              category: r.category as RoomCategory, type: (r.type || 'standard') as RoomType,
              maxGuests: r.max_guests || 2, bedsCount: r.beds_count || 1, hasMinibar: !!r.has_minibar, hasBalcony: !!r.has_balcony
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

      createTask: async (data) => {
        if (!supabase) return;
        const id = `t-${Date.now()}`;
        const room = get().rooms.find(r => r.id === data.roomId);
        const staff = get().users.find(u => u.id === data.assignedTo);
        const template = CHECKLIST_TEMPLATES[room?.id!] || CHECKLIST_TEMPLATES[room?.category!] || CHECKLIST_TEMPLATES[RoomCategory.GUEST_ROOM];
        
        const payload = {
          id,
          room_id: data.roomId,
          assigned_to: data.assignedTo,
          assigned_by_name: get().currentUser?.fullName || 'Gerente',
          status: 'pendente',
          deadline: data.deadline,
          notes: data.notes,
          checklist: template.reduce((acc, cur) => ({ ...acc, [cur]: false }), {})
        };

        const { error } = await supabase.from('tasks').insert(payload);
        if (!error) {
          await supabase.from('rooms').update({ status: 'limpando' }).eq('id', data.roomId);
          await get().syncData();
        }
      },

      updateTask: async (taskId, updates) => {
        if (!supabase) return;
        const { error } = await supabase.from('tasks').update({
          status: updates.status,
          checklist: updates.checklist,
          photos: updates.photos,
          started_at: updates.startedAt,
          completed_at: updates.completedAt,
          duration_minutes: updates.durationMinutes,
          fator_mamae_verified: updates.fatorMamaeVerified
        }).eq('id', taskId);
        if (!error) await get().syncData();
      },

      approveTask: async (taskId) => {
        if (!supabase) return;
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        const { error } = await supabase.from('tasks').update({ status: 'aprovado' }).eq('id', taskId);
        if (!error) {
          await supabase.from('rooms').update({ status: 'disponivel' }).eq('id', task.roomId);
          await get().syncData();
        }
      },

      updateRoomStatus: async (roomId, status) => {
        if (!supabase) return;
        const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId);
        if (!error) await get().syncData();
      },

      addUser: async (userData) => {
        if (!supabase) return;
        const id = `u-${Date.now()}`;
        const { error } = await supabase.from('users').insert({
          id, email: userData.email, full_name: userData.fullName, role: userData.role, password: userData.password
        });
        if (!error) await get().syncData();
      },

      removeUser: async (id) => {
        if (!supabase) return;
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (!error) await get().syncData();
      },

      logout: () => set({ currentUser: null }),
    }),
    {
      name: 'hospedapro-v4-real',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
