
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction, PaymentMethod
} from './types';
import { CLEANING_CHECKLIST_TEMPLATE } from './constants';

// Força a leitura das variáveis de ambiente injetadas pelo Vite/Vercel
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

export const supabase = SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
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
  connectionError: string | null;
  
  login: (email: string, password?: string) => Promise<boolean>;
  quickLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  updateRoomICal: (roomId: string, url: string) => Promise<void>;
  syncICal: (roomId: string) => Promise<void>;
  checkIn: (guest: Omit<Guest, 'id'>) => Promise<void>;
  checkOut: (guestId: string) => Promise<void>;
  
  syncData: () => Promise<void>;
  checkConnection: () => Promise<void>;
  createTask: (data: Partial<CleaningTask>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<CleaningTask>) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  addLaundry: (item: Omit<LaundryItem, 'id' | 'lastUpdated'>) => void;
  moveLaundry: (itemId: string, stage: LaundryStage) => void;
  addInventory: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventory: (id: string, qty: number) => Promise<void>;
  addAnnouncement: (content: string, priority: 'low' | 'normal' | 'high') => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'date'>) => void;
  resetData: () => void;
}

const generateInitialRooms = (): Room[] => {
  const rooms: Room[] = [];
  ['101', '102', '103', '104'].forEach(n => rooms.push({
    id: n, number: n, floor: 1, type: RoomType.STANDARD, category: RoomCategory.GUEST_ROOM,
    status: RoomStatus.DISPONIVEL, maxGuests: 2, bedsCount: 2, hasMinibar: true, hasBalcony: false
  }));
  ['201', '202', '203', '204', '205'].forEach(n => rooms.push({
    id: n, number: n, floor: 2, type: RoomType.STANDARD, category: RoomCategory.GUEST_ROOM,
    status: RoomStatus.DISPONIVEL, maxGuests: 2, bedsCount: 2, hasMinibar: true, hasBalcony: true
  }));
  return rooms;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      rooms: generateInitialRooms(),
      tasks: [],
      laundry: [],
      guests: [],
      inventory: [],
      announcements: [],
      transactions: [],
      isSupabaseConnected: false,
      connectionError: null,

      checkConnection: async () => {
        if (!supabase) {
          set({ isSupabaseConnected: false, connectionError: 'Configurações ausentes na Vercel.' });
          return;
        }
        try {
          // Tenta uma operação mínima para checar se o servidor responde
          const { error } = await supabase.from('users').select('id').limit(1);
          // Se não houve erro de rede (mesmo que seja erro de permissão), consideramos conectado
          const connected = !error || (error && error.code !== 'PGRST301' && error.message !== 'Failed to fetch');
          set({ isSupabaseConnected: !!connected, connectionError: error ? error.message : null });
          if (connected) get().syncData();
        } catch (err: any) {
          set({ isSupabaseConnected: false, connectionError: err.message });
        }
      },

      syncData: async () => {
        if (!supabase) return;
        
        try {
          const [usersReq, roomsReq, tasksReq, announcementsReq, inventoryReq, guestsReq] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('rooms').select('*'),
            supabase.from('tasks').select('*'),
            supabase.from('announcements').select('*').order('created_at', { ascending: false }),
            supabase.from('inventory').select('*'),
            supabase.from('guests').select('*')
          ]);

          if (usersReq.data) {
            set({ users: usersReq.data.map(u => ({
              id: u.id, email: u.email, fullName: u.full_name, 
              role: u.role as UserRole, avatarUrl: u.avatar_url, password: u.password
            })) });
          }

          if (roomsReq.data && roomsReq.data.length > 0) {
            set({ rooms: roomsReq.data.map(r => ({
              id: r.id, number: r.number, floor: r.floor, status: r.status as RoomStatus,
              category: r.category as RoomCategory, bedsCount: r.beds_count, icalUrl: r.ical_url,
              type: RoomType.STANDARD, maxGuests: 2, hasMinibar: true, hasBalcony: false
            })) });
          }

          if (tasksReq.data) {
            set({ tasks: tasksReq.data.map(t => ({
              id: t.id, roomId: t.room_id, assignedTo: t.assigned_to, 
              assignedByName: t.assigned_by_name, status: t.status as CleaningStatus,
              startedAt: t.started_at, completedAt: t.completed_at,
              durationMinutes: t.duration_minutes, deadline: t.deadline,
              notes: t.notes, fatorMamaeVerified: t.fator_mamae_verified,
              bedsToMake: t.beds_to_make, checklist: t.checklist || {}, photos: t.photos || []
            })) });
          }

          if (announcementsReq.data) {
            set({ announcements: announcementsReq.data.map(a => ({
              id: a.id, authorName: a.author_name, content: a.content,
              createdAt: a.created_at, priority: a.priority as 'low' | 'normal' | 'high'
            })) });
          }

          if (inventoryReq.data) {
            set({ inventory: inventoryReq.data.map(i => ({
              id: i.id, name: i.name, category: i.category, quantity: i.quantity,
              minStock: i.min_stock, unitCost: i.unit_cost, price: i.unit_cost * 1.5
            })) });
          }

          if (guestsReq.data) {
            set({ guests: guestsReq.data.map(g => ({
              id: g.id, fullName: g.full_name, document: g.document,
              checkIn: g.check_in, checkOut: g.check_out, roomId: g.room_id,
              totalValue: g.total_value, paymentMethod: g.payment_method as PaymentMethod,
              checkedOutAt: g.checked_out_at, dailyRate: 150
            })) });
          }
        } catch (e) {
          console.error("Erro na sincronização:", e);
        }
      },

      login: async (email, password) => {
        if (!supabase) return false;
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('password', password)
            .single();

          if (data && !error) {
            const user: User = {
              id: data.id, email: data.email, fullName: data.full_name,
              role: data.role as UserRole, avatarUrl: data.avatar_url, password: data.password
            };
            set({ currentUser: user });
            get().syncData();
            return true;
          }
        } catch (e) {
          console.error("Erro no login:", e);
        }
        return false;
      },

      quickLogin: async (role) => {
        const user = get().users.find(u => u.role === role);
        if (user) set({ currentUser: user });
      },

      logout: () => set({ currentUser: null }),

      addUser: async (userData) => {
        const id = `u-${Date.now()}`;
        if (supabase) {
          await supabase.from('users').insert({
            id, email: userData.email, full_name: userData.fullName,
            password: userData.password, role: userData.role
          });
        }
        get().syncData();
      },

      removeUser: async (id) => {
        if (supabase) await supabase.from('users').delete().eq('id', id);
        get().syncData();
      },

      updateCurrentUser: async (updates) => {
        const user = get().currentUser;
        if (!user) return;
        if (supabase) {
          await supabase.from('users').update({
            full_name: updates.fullName,
            avatar_url: updates.avatarUrl,
            email: updates.email
          }).eq('id', user.id);
        }
        get().syncData();
      },

      updateUserPassword: async (userId, newPassword) => {
        if (supabase) await supabase.from('users').update({ password: newPassword }).eq('id', userId);
        get().syncData();
      },

      updateRoomStatus: async (roomId, status) => {
        if (supabase) await supabase.from('rooms').upsert({ id: roomId, status });
        get().syncData();
      },

      updateRoomICal: async (roomId, url) => {
        if (supabase) await supabase.from('rooms').upsert({ id: roomId, ical_url: url });
        get().syncData();
      },

      syncICal: async (roomId) => {
        get().syncData();
      },

      checkIn: async (guestData) => {
        const id = `g-${Date.now()}`;
        if (supabase) {
          await supabase.from('guests').insert({
            id, full_name: guestData.fullName, document: guestData.document,
            room_id: guestData.roomId, check_in: guestData.checkIn,
            check_out: guestData.checkOut, total_value: guestData.totalValue,
            payment_method: guestData.paymentMethod
          });
          await supabase.from('rooms').update({ status: RoomStatus.OCUPADO }).eq('id', guestData.roomId);
        }
        get().syncData();
      },

      checkOut: async (guestId) => {
        const guest = get().guests.find(g => g.id === guestId);
        if (!guest || !supabase) return;
        await supabase.from('guests').update({ checked_out_at: new Date().toISOString() }).eq('id', guestId);
        await supabase.from('rooms').update({ status: RoomStatus.SUJO }).eq('id', guest.roomId);
        get().syncData();
      },

      createTask: async (data) => {
        const id = `t-${Date.now()}`;
        if (supabase) {
          await supabase.from('tasks').insert({
            id, room_id: data.roomId, assigned_to: data.assignedTo,
            assigned_by_name: get().currentUser?.fullName || 'Admin',
            status: CleaningStatus.PENDENTE, deadline: data.deadline,
            notes: data.notes, beds_to_make: data.bedsToMake || 0,
            checklist: CLEANING_CHECKLIST_TEMPLATE.reduce((acc, cur) => ({ ...acc, [cur]: false }), {}),
            photos: []
          });
        }
        get().syncData();
      },

      updateTask: async (taskId, updates) => {
        if (supabase) {
          const mapped: any = {};
          if (updates.status) mapped.status = updates.status;
          if (updates.checklist) mapped.checklist = updates.checklist;
          if (updates.photos) mapped.photos = updates.photos;
          if (updates.startedAt) mapped.started_at = updates.startedAt;
          if (updates.completedAt) mapped.completed_at = updates.completedAt;
          if (updates.fatorMamaeVerified !== undefined) mapped.fator_mamae_verified = updates.fatorMamaeVerified;
          
          await supabase.from('tasks').update(mapped).eq('id', taskId);
        }
        get().syncData();
      },

      approveTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (supabase && task) {
          await supabase.from('tasks').update({ status: CleaningStatus.APROVADO }).eq('id', taskId);
          await supabase.from('rooms').update({ status: RoomStatus.DISPONIVEL }).eq('id', task.roomId);
        }
        get().syncData();
      },

      addLaundry: (item) => set((state) => ({ laundry: [...state.laundry, { ...item, id: `l-${Date.now()}`, lastUpdated: new Date().toISOString() }] })),
      moveLaundry: (itemId, stage) => set((state) => ({ laundry: state.laundry.map(l => l.id === itemId ? { ...l, stage, lastUpdated: new Date().toISOString() } : l) })),
      
      addInventory: async (item) => {
        if (supabase) {
          await supabase.from('inventory').insert({
            id: `i-${Date.now()}`, name: item.name, category: item.category,
            quantity: item.quantity, min_stock: item.minStock, unit_cost: item.unitCost
          });
        }
        get().syncData();
      },

      updateInventory: async (id, qty) => {
        const item = get().inventory.find(i => i.id === id);
        if (item && supabase) {
          await supabase.from('inventory').update({ quantity: Math.max(0, item.quantity + qty) }).eq('id', id);
        }
        get().syncData();
      },

      addAnnouncement: async (content, priority) => {
        if (supabase) {
          await supabase.from('announcements').insert({
            id: `a-${Date.now()}`, author_name: get().currentUser?.fullName || 'Sistema',
            content, priority, created_at: new Date().toISOString()
          });
        }
        get().syncData();
      },

      addTransaction: (data) => set((state) => ({ transactions: [{ ...data, id: `tr-${Date.now()}`, date: new Date().toISOString() }, ...state.transactions] })),
      resetData: () => set({ rooms: generateInitialRooms(), tasks: [], laundry: [], guests: [], inventory: [], transactions: [] })
    }),
    {
      name: 'hospedapro-v30-final',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.checkConnection();
      },
    }
  )
);
