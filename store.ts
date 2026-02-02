
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction
} from './types';
import { CLEANING_CHECKLIST_TEMPLATE } from './constants';

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
  
  login: (email: string, password?: string) => Promise<boolean>;
  quickLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  updateRoomICal: (roomId: string, url: string) => Promise<void>;
  checkIn: (guest: Omit<Guest, 'id'>) => Promise<void>;
  checkOut: (guestId: string) => Promise<void>;
  
  syncData: () => Promise<void>;
  checkConnection: () => Promise<void>;
  createTask: (data: Partial<CleaningTask>) => void;
  updateTask: (taskId: string, updates: Partial<CleaningTask>) => void;
  approveTask: (taskId: string) => void;
  addLaundry: (item: Omit<LaundryItem, 'id' | 'lastUpdated'>) => void;
  moveLaundry: (itemId: string, stage: LaundryStage) => void;
  addInventory: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventory: (id: string, qty: number) => void;
  addAnnouncement: (content: string, priority: 'low' | 'normal' | 'high') => void;
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

      checkConnection: async () => {
        if (!supabase) return;
        try {
          const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
          const connected = !error;
          set({ isSupabaseConnected: connected });
          if (connected) get().syncData();
        } catch {
          set({ isSupabaseConnected: false });
        }
      },

      syncData: async () => {
        if (!supabase) return;
        
        // Sincroniza Usuários
        const { data: userData } = await supabase.from('users').select('*');
        if (userData) {
          set({ users: userData.map(u => ({
            id: u.id, email: u.email, fullName: u.full_name, 
            role: u.role as UserRole, avatarUrl: u.avatar_url, password: u.password
          })) });
        }

        // Sincroniza Quartos
        const { data: roomsData } = await supabase.from('rooms').select('*');
        if (roomsData && roomsData.length > 0) {
          set({ rooms: roomsData.map(r => ({
            id: r.id, number: r.number, floor: r.floor, status: r.status,
            category: r.category, bedsCount: r.beds_count, icalUrl: r.ical_url,
            type: RoomType.STANDARD, maxGuests: 2, hasMinibar: true, hasBalcony: false
          })) });
        }
      },

      login: async (email, password) => {
        if (!supabase) return false;
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
          return true;
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
        const newUser = { ...userData, id };
        set((state) => ({ users: [...state.users, newUser as User] }));
        if (supabase) {
          await supabase.from('users').insert({
            id, email: userData.email, full_name: userData.fullName,
            password: userData.password, role: userData.role
          });
        }
      },

      removeUser: async (id) => {
        set((state) => ({ users: state.users.filter(u => u.id !== id) }));
        if (supabase) await supabase.from('users').delete().eq('id', id);
      },

      updateCurrentUser: async (updates) => {
        const user = get().currentUser;
        if (!user) return;
        set((state) => ({
          currentUser: { ...user, ...updates },
          users: state.users.map(u => u.id === user.id ? { ...u, ...updates } : u)
        }));
        if (supabase) {
          await supabase.from('users').update({
            full_name: updates.fullName,
            avatar_url: updates.avatarUrl,
            email: updates.email
          }).eq('id', user.id);
        }
      },

      updateUserPassword: async (userId, newPassword) => {
        set((state) => ({
          users: state.users.map(u => u.id === userId ? { ...u, password: newPassword } : u),
          currentUser: state.currentUser?.id === userId ? { ...state.currentUser, password: newPassword } : state.currentUser
        }));
        if (supabase) await supabase.from('users').update({ password: newPassword }).eq('id', userId);
      },

      updateRoomStatus: async (roomId, status) => {
        set((state) => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, status } : r) }));
        if (supabase) await supabase.from('rooms').upsert({ id: roomId, status });
      },

      updateRoomICal: async (roomId, url) => {
        set((state) => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, icalUrl: url } : r) }));
        if (supabase) await supabase.from('rooms').update({ ical_url: url }).eq('id', roomId);
      },

      checkIn: async (guestData) => {
        const id = `g-${Date.now()}`;
        set((state) => ({
          guests: [...state.guests, { ...guestData, id }],
          rooms: state.rooms.map(r => r.id === guestData.roomId ? { ...r, status: RoomStatus.OCUPADO } : r)
        }));
        if (supabase) {
          await supabase.from('guests').insert({
            id, full_name: guestData.fullName, document: guestData.document,
            room_id: guestData.roomId, check_in: guestData.checkIn,
            check_out: guestData.checkOut, total_value: guestData.totalValue
          });
          await supabase.from('rooms').update({ status: RoomStatus.OCUPADO }).eq('id', guestData.roomId);
        }
      },

      checkOut: async (guestId) => {
        const guest = get().guests.find(g => g.id === guestId);
        if (!guest) return;
        set((state) => ({
          guests: state.guests.map(g => g.id === guestId ? { ...g, checkedOutAt: new Date().toISOString() } : g),
          rooms: state.rooms.map(r => r.id === guest.roomId ? { ...r, status: RoomStatus.SUJO } : r)
        }));
        if (supabase) {
          await supabase.from('guests').delete().eq('id', guestId);
          await supabase.from('rooms').update({ status: RoomStatus.SUJO }).eq('id', guest.roomId);
        }
      },

      createTask: (data) => set((state) => ({
        tasks: [...state.tasks, {
          id: `t-${Date.now()}`, roomId: data.roomId!, status: CleaningStatus.PENDENTE,
          fatorMamaeVerified: false, bedsToMake: data.bedsToMake || 0,
          checklist: CLEANING_CHECKLIST_TEMPLATE.reduce((acc, cur) => ({ ...acc, [cur]: false }), {}),
          photos: [], ...data
        } as CleaningTask]
      })),
      updateTask: (taskId, updates) => set((state) => ({ tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) })),
      approveTask: (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        set((state) => ({
          tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: CleaningStatus.APROVADO, completedAt: new Date().toISOString() } : t),
          rooms: state.rooms.map(r => r.id === task?.roomId ? { ...r, status: RoomStatus.DISPONIVEL } : r)
        }));
      },
      addLaundry: (item) => set((state) => ({ laundry: [...state.laundry, { ...item, id: `l-${Date.now()}`, lastUpdated: new Date().toISOString() }] })),
      moveLaundry: (itemId, stage) => set((state) => ({ laundry: state.laundry.map(l => l.id === itemId ? { ...l, stage, lastUpdated: new Date().toISOString() } : l) })),
      addInventory: (item) => set((state) => ({ inventory: [...state.inventory, { ...item, id: `i-${Date.now()}` }] })),
      updateInventory: (id, qty) => set((state) => ({ inventory: state.inventory.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + qty) } : i) })),
      addAnnouncement: (content, priority) => set((state) => ({
        announcements: [{ id: `a-${Date.now()}`, authorName: state.currentUser?.fullName || 'Sistema', content, priority, createdAt: new Date().toISOString() }, ...state.announcements]
      })),
      addTransaction: (data) => set((state) => ({ transactions: [{ ...data, id: `tr-${Date.now()}`, date: new Date().toISOString() }, ...state.transactions] })),
      resetData: () => set({ rooms: generateInitialRooms(), tasks: [], laundry: [], guests: [], inventory: [], transactions: [] })
    }),
    {
      name: 'hospedapro-v12-real-production',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.checkConnection();
      },
    }
  )
);
