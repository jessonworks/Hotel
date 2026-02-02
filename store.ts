
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction, PaymentMethod
} from './types';
import { CHECKLIST_TEMPLATES } from './constants';

const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return process.env[key] || import.meta.env[`VITE_${key}`] || import.meta.env[key] || '';
  } catch {
    return '';
  }
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_KEY = getEnv('SUPABASE_ANON_KEY');

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
  isDemoMode: boolean;
  cloudAvailableAgain: boolean;
  connectionError: string | null;
  managerBriefing: string | null;
  
  login: (email: string, password?: string) => Promise<boolean>;
  quickLogin: (role: UserRole) => Promise<void>;
  enterDemoMode: (role: UserRole, specificUser?: Partial<User>) => void;
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
  addTransaction: (data: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  generateAIBriefing: () => Promise<void>;
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
  ['301', '302', '303', '304', '305', '306'].forEach(n => rooms.push({
    id: n, number: n, floor: 3, type: RoomType.STANDARD, category: RoomCategory.GUEST_ROOM,
    status: RoomStatus.DISPONIVEL, maxGuests: 2, bedsCount: 2, hasMinibar: true, hasBalcony: true
  }));
  
  const commonAreas = [
    { id: 'area-cozinha', name: 'Cozinha' },
    { id: 'area-recepcao', name: 'Recepção' },
    { id: 'area-escadas', name: 'Escadas' },
    { id: 'area-laje', name: 'Laje' },
  ];
  
  commonAreas.forEach(a => rooms.push({
    id: a.id, number: a.name, floor: 0, type: RoomType.AREA, category: RoomCategory.COMMON_AREA,
    status: RoomStatus.DISPONIVEL, maxGuests: 0, bedsCount: 0, hasMinibar: false, hasBalcony: false
  }));
  
  return rooms;
};

const DEMO_STAFF_USERS: User[] = [
  { id: 'st-1', email: 'lucia@hotel.com', fullName: 'Lúcia (Staff)', role: UserRole.STAFF, password: 'demo' },
  { id: 'st-2', email: 'roberto@hotel.com', fullName: 'Roberto (Staff)', role: UserRole.STAFF, password: 'demo' }
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: DEMO_STAFF_USERS,
      rooms: generateInitialRooms(),
      tasks: [],
      laundry: [],
      guests: [],
      inventory: [],
      announcements: [],
      transactions: [],
      isSupabaseConnected: false,
      isDemoMode: false,
      cloudAvailableAgain: false,
      connectionError: null,
      managerBriefing: null,

      checkConnection: async () => {
        if (!supabase) {
          set({ isSupabaseConnected: false, connectionError: 'Supabase Offline' });
          return;
        }
        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          const connected = !error || (error && error.message !== 'Failed to fetch');
          set({ isSupabaseConnected: !!connected, connectionError: error ? error.message : null });
          if (connected && !get().isDemoMode) get().syncData();
        } catch (err: any) {
          set({ isSupabaseConnected: false, connectionError: err.message });
        }
      },

      enterDemoMode: (role: UserRole, specificUser?: Partial<User>) => {
        const demoUser: User = specificUser?.id ? {
          id: specificUser.id,
          email: specificUser.email || `demo-${specificUser.id}@hotel.com`,
          fullName: specificUser.fullName || 'User Demo',
          role: specificUser.role || UserRole.STAFF,
          password: 'demo'
        } : {
          id: `demo-admin`,
          email: `admin@hotel.com`,
          fullName: `Admin Demo`,
          role: role,
          password: 'demo'
        };
        
        set({ 
          currentUser: demoUser, 
          users: DEMO_STAFF_USERS, 
          isDemoMode: true, 
          isSupabaseConnected: false,
          connectionError: 'Modo Demo Ativo'
        });
      },

      syncData: async () => {
        if (!supabase || get().isDemoMode) return;
        // Sync data implementation...
      },

      generateAIBriefing: async () => {
        set({ managerBriefing: null });
      },

      login: async (email, password) => {
        if (!supabase) return false;
        const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).eq('password', password).single();
        if (data && !error) {
          set({ currentUser: { id: data.id, email: data.email, fullName: data.full_name, role: data.role as UserRole, avatarUrl: data.avatar_url, password: data.password }, isDemoMode: false });
          get().syncData();
          return true;
        }
        return false;
      },

      quickLogin: async (role) => {
        const user = get().users.find(u => u.role === role);
        if (user) set({ currentUser: user, isDemoMode: false });
      },

      logout: () => set({ currentUser: null, managerBriefing: null, isDemoMode: false }),

      addUser: async (userData) => {
        const id = `u-${Date.now()}`;
        if (get().isDemoMode) set(state => ({ users: [...state.users, { ...userData, id }] }));
        else {
           if (supabase) await supabase.from('users').insert({ id, email: userData.email, full_name: userData.fullName, password: userData.password, role: userData.role });
           get().syncData();
        }
      },

      removeUser: async (id) => {
        if (get().isDemoMode) set(state => ({ users: state.users.filter(u => u.id !== id) }));
        else {
          if (supabase) await supabase.from('users').delete().eq('id', id);
          get().syncData();
        }
      },

      updateCurrentUser: async (updates) => {
        const user = get().currentUser;
        if (!user) return;
        if (get().isDemoMode) set({ currentUser: { ...user, ...updates } });
        else if (supabase) {
          await supabase.from('users').update({ full_name: updates.fullName, avatar_url: updates.avatarUrl, email: updates.email }).eq('id', user.id);
          get().syncData();
        }
      },

      updateUserPassword: async (userId, newPassword) => {
        if (supabase && !get().isDemoMode) await supabase.from('users').update({ password: newPassword }).eq('id', userId);
        get().syncData();
      },

      updateRoomStatus: async (roomId, status) => {
        if (supabase && !get().isDemoMode) await supabase.from('rooms').upsert({ id: roomId, status });
        set(state => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, status } : r) }));
        if (!get().isDemoMode) get().syncData();
      },

      updateRoomICal: async (roomId, url) => {
        if (supabase && !get().isDemoMode) await supabase.from('rooms').upsert({ id: roomId, ical_url: url });
        get().syncData();
      },

      syncICal: async (roomId) => {
        get().syncData();
      },

      checkIn: async (guestData) => {
        const id = `g-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('guests').insert({ id, full_name: guestData.fullName, document: guestData.document, room_id: guestData.roomId, check_in: guestData.checkIn, check_out: guestData.checkOut, total_value: guestData.totalValue, payment_method: guestData.paymentMethod });
          await supabase.from('rooms').update({ status: RoomStatus.OCUPADO }).eq('id', guestData.roomId);
          await supabase.from('transactions').insert({ id: `tr-${Date.now()}`, date: new Date().toISOString(), type: 'INCOME', category: 'RESERVATION', amount: guestData.totalValue, description: `Reserva: ${guestData.fullName} (Unid. ${guestData.roomId})` });
        }
        set(state => ({
           guests: [...state.guests, { ...guestData, id, dailyRate: guestData.dailyRate || 150 }],
           rooms: state.rooms.map(r => r.id === guestData.roomId ? { ...r, status: RoomStatus.OCUPADO } : r)
        }));
        if (!get().isDemoMode) get().syncData();
      },

      checkOut: async (guestId) => {
        const guest = get().guests.find(g => g.id === guestId);
        if (!guest) return;
        if (!get().isDemoMode && supabase) {
          await supabase.from('guests').update({ checked_out_at: new Date().toISOString() }).eq('id', guestId);
          await supabase.from('rooms').update({ status: RoomStatus.SUJO }).eq('id', guest.roomId);
        }
        set(state => ({
           guests: state.guests.map(g => g.id === guestId ? { ...g, checkedOutAt: new Date().toISOString() } : g),
           rooms: state.rooms.map(r => r.id === guest.roomId ? { ...r, status: RoomStatus.SUJO } : r)
        }));
        if (!get().isDemoMode) get().syncData();
      },

      createTask: async (data) => {
        const id = `t-${Date.now()}`;
        const room = get().rooms.find(r => r.id === data.roomId);
        
        // Seleciona o template de checklist correto
        const template = CHECKLIST_TEMPLATES[data.roomId!] || CHECKLIST_TEMPLATES[room?.category!] || CHECKLIST_TEMPLATES[RoomCategory.GUEST_ROOM];
        
        const initialChecklist = template.reduce((acc, cur) => ({ ...acc, [cur]: false }), {});

        if (!get().isDemoMode && supabase) {
          await supabase.from('tasks').insert({ id, room_id: data.roomId, assigned_to: data.assignedTo, assigned_by_name: get().currentUser?.fullName || 'Admin', status: CleaningStatus.PENDENTE, deadline: data.deadline, notes: data.notes, beds_to_make: data.bedsToMake || 0, checklist: initialChecklist, photos: [] });
        }
        
        set(state => ({
           tasks: [...state.tasks, { 
             id, 
             roomId: data.roomId!, 
             assignedTo: data.assignedTo, 
             assignedByName: get().currentUser?.fullName || 'Admin', 
             status: CleaningStatus.PENDENTE, 
             deadline: data.deadline, 
             notes: data.notes, 
             bedsToMake: data.bedsToMake || 0, 
             checklist: initialChecklist, 
             photos: [],
             fatorMamaeVerified: false 
           }]
        }));
        if (!get().isDemoMode) get().syncData();
      },

      updateTask: async (taskId, updates) => {
        if (!get().isDemoMode && supabase) {
          await supabase.from('tasks').update({ ...updates }).eq('id', taskId);
        }
        set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }));
        if (!get().isDemoMode) get().syncData();
      },

      approveTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;
        if (!get().isDemoMode && supabase) {
          await supabase.from('tasks').update({ status: CleaningStatus.APROVADO }).eq('id', taskId);
          await supabase.from('rooms').update({ status: RoomStatus.DISPONIVEL }).eq('id', task.roomId);
        }
        set(state => ({
           tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: CleaningStatus.APROVADO } : t),
           rooms: state.rooms.map(r => r.id === task.roomId ? { ...r, status: RoomStatus.DISPONIVEL } : r)
        }));
        if (!get().isDemoMode) get().syncData();
      },

      addLaundry: (item) => set((state) => ({ laundry: [...state.laundry, { ...item, id: `l-${Date.now()}`, lastUpdated: new Date().toISOString() }] })),
      moveLaundry: (itemId, stage) => set((state) => ({ laundry: state.laundry.map(l => l.id === itemId ? { ...l, stage, lastUpdated: new Date().toISOString() } : l) })),
      
      addInventory: async (item) => {
        const id = `i-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('inventory').insert({ id, name: item.name, category: item.category, quantity: item.quantity, min_stock: item.minStock, unit_cost: item.unitCost });
        }
        set(state => ({ inventory: [...state.inventory, { ...item, id, price: item.unitCost * 1.5 }] }));
        if (!get().isDemoMode) get().syncData();
      },

      updateInventory: async (id, qty) => {
        const item = get().inventory.find(i => i.id === id);
        if (!item) return;
        if (!get().isDemoMode && supabase) {
          await supabase.from('inventory').update({ quantity: Math.max(0, item.quantity + qty) }).eq('id', id);
        }
        set(state => ({ inventory: state.inventory.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + qty) } : i) }));
        if (!get().isDemoMode) get().syncData();
      },

      addAnnouncement: async (content, priority) => {
        const id = `a-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('announcements').insert({ id, author_name: get().currentUser?.fullName || 'Sistema', content, priority, created_at: new Date().toISOString() });
        }
        set(state => ({ announcements: [{ id, authorName: get().currentUser?.fullName || 'Sistema', content, priority, createdAt: new Date().toISOString() }, ...state.announcements] }));
      },

      addTransaction: async (data) => {
        const id = `tr-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('transactions').insert({ id, date: new Date().toISOString(), type: data.type, category: data.category, amount: data.amount, description: data.description });
        }
        set(state => ({ transactions: [{ ...data, id, date: new Date().toISOString() }, ...state.transactions] }));
      },

      resetData: () => set({ rooms: generateInitialRooms(), tasks: [], laundry: [], guests: [], inventory: [], transactions: [] })
    }),
    {
      name: 'hospedapro-v64-areas-fixed',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.checkConnection();
      },
    }
  )
);
