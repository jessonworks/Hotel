
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

// Tenta capturar tanto SUPABASE_URL quanto URL_SUPABASE (conforme print da Vercel)
const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('URL_SUPABASE');
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

const inferRoleByEmail = (email: string): UserRole => {
  const e = email.toLowerCase();
  if (e.includes('admin')) return UserRole.ADMIN;
  if (e.includes('gerente')) return UserRole.MANAGER;
  return UserRole.STAFF;
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
      isDemoMode: false,
      cloudAvailableAgain: false,
      connectionError: null,
      managerBriefing: null,

      checkConnection: async () => {
        // Validação robusta de presença de chaves
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          set({ isSupabaseConnected: false, connectionError: 'Faltam chaves na Vercel' });
          return;
        }
        
        if (!supabase) {
          set({ isSupabaseConnected: false, connectionError: 'Erro de Inicialização' });
          return;
        }

        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          if (error) throw error;
          set({ isSupabaseConnected: true, connectionError: null });
          if (!get().isDemoMode && get().currentUser) get().syncData();
        } catch (err: any) {
          console.error("Supabase Error:", err);
          set({ isSupabaseConnected: false, connectionError: 'Banco Offline' });
        }
      },

      syncData: async () => {
        if (!supabase || get().isDemoMode) return;
        
        try {
          const [
            { data: roomsData },
            { data: tasksData },
            { data: guestsData },
            { data: invData },
            { data: annData },
            { data: transData },
            { data: usersData }
          ] = await Promise.all([
            supabase.from('rooms').select('*'),
            supabase.from('tasks').select('*'),
            supabase.from('guests').select('*'),
            supabase.from('inventory').select('*'),
            supabase.from('announcements').select('*').order('created_at', { ascending: false }),
            supabase.from('transactions').select('*').order('date', { ascending: false }),
            supabase.from('users').select('*')
          ]);

          if (roomsData) set({ rooms: roomsData.map(r => ({
            id: r.id, number: r.number, floor: r.floor, type: r.type, category: r.category,
            status: r.status, maxGuests: r.max_guests, bedsCount: r.beds_count,
            hasMinibar: r.has_minibar, hasBalcony: r.has_balcony, icalUrl: r.ical_url
          }))});

          if (usersData) set({ users: usersData.map(u => ({
            id: u.id, email: u.email, fullName: u.full_name, role: inferRoleByEmail(u.email),
            password: u.password, avatarUrl: u.avatar_url
          }))});

          if (tasksData) set({ tasks: tasksData.map(t => ({
            id: t.id, roomId: t.room_id, assignedTo: t.assigned_to, assignedByName: t.assigned_by_name,
            status: t.status, startedAt: t.started_at, completedAt: t.completed_at,
            durationMinutes: t.duration_minutes, deadline: t.deadline, notes: t.notes,
            fatorMamaeVerified: t.fator_mamae_verified, bedsToMake: t.beds_to_make,
            checklist: t.checklist || {}, photos: t.photos || []
          }))});

          if (guestsData) set({ guests: guestsData.map(g => ({
            id: g.id, fullName: g.full_name, document: g.document, checkIn: g.check_in,
            checkOut: g.check_out, roomId: g.room_id, checkedOutAt: g.checked_out_at,
            dailyRate: g.daily_rate || 150, totalValue: g.total_value, paymentMethod: g.payment_method
          }))});

          if (invData) set({ inventory: invData.map(i => ({
            id: i.id, name: i.name, category: i.category, quantity: i.quantity,
            minStock: i.min_stock, price: i.price || (i.unit_cost * 1.5), unitCost: i.unit_cost
          }))});

          if (annData) set({ announcements: annData.map(a => ({
            id: a.id, authorName: a.author_name, content: a.content,
            createdAt: a.created_at, priority: a.priority
          }))});

          if (transData) set({ transactions: transData.map(t => ({
            id: t.id, date: t.date, type: t.type, category: t.category,
            amount: t.amount, description: t.description
          }))});

        } catch (e) {
          console.error("Erro na sincronização:", e);
        }
      },

      login: async (email, password) => {
        if (!supabase) return false;
        const { data, error } = await supabase.from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .eq('password', password)
          .single();

        if (data && !error) {
          const user: User = { 
            id: data.id, 
            email: data.email, 
            fullName: data.full_name, 
            role: inferRoleByEmail(data.email), 
            avatarUrl: data.avatar_url, 
            password: data.password 
          };
          set({ currentUser: user, isDemoMode: false });
          get().syncData();
          return true;
        }
        return false;
      },

      enterDemoMode: (role: UserRole, specificUser?: Partial<User>) => {
        const demoUser: User = {
          id: specificUser?.id || `demo-${role}`,
          email: specificUser?.email || `${role}@hotel.com`,
          fullName: specificUser?.fullName || `${role.toUpperCase()} Demo`,
          role: role,
          password: 'demo'
        };
        set({ currentUser: demoUser, isDemoMode: true });
      },

      logout: () => set({ currentUser: null, isDemoMode: false, rooms: generateInitialRooms() }),

      updateRoomStatus: async (roomId, status) => {
        if (supabase && !get().isDemoMode) {
          await supabase.from('rooms').upsert({ id: roomId, status });
          get().syncData();
        } else {
          set(state => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, status } : r) }));
        }
      },

      createTask: async (data) => {
        const id = `t-${Date.now()}`;
        const room = get().rooms.find(r => r.id === data.roomId);
        const template = CHECKLIST_TEMPLATES[data.roomId!] || CHECKLIST_TEMPLATES[room?.category!] || CHECKLIST_TEMPLATES[RoomCategory.GUEST_ROOM];
        const initialChecklist = template.reduce((acc, cur) => ({ ...acc, [cur]: false }), {});

        if (!get().isDemoMode && supabase) {
          await supabase.from('tasks').insert({
            id, room_id: data.roomId, assigned_to: data.assignedTo,
            assigned_by_name: get().currentUser?.fullName || 'Admin',
            status: CleaningStatus.PENDENTE, deadline: data.deadline,
            notes: data.notes, beds_to_make: data.bedsToMake || 0,
            checklist: initialChecklist, photos: []
          });
          get().syncData();
        } else {
          set(state => ({
            tasks: [...state.tasks, { 
              id, roomId: data.roomId!, assignedTo: data.assignedTo,
              assignedByName: get().currentUser?.fullName || 'Admin',
              status: CleaningStatus.PENDENTE, deadline: data.deadline,
              notes: data.notes, bedsToMake: data.bedsToMake || 0,
              checklist: initialChecklist, photos: [], fatorMamaeVerified: false 
            }]
          }));
        }
      },

      resetData: () => set({ rooms: generateInitialRooms(), tasks: [], laundry: [], guests: [], inventory: [], transactions: [] }),
      
      updateCurrentUser: async (updates) => {},
      updateUserPassword: async (userId, newPassword) => {},
      addUser: async (userData) => {},
      removeUser: async (id) => {},
      updateRoomICal: async (roomId, url) => {},
      syncICal: async (roomId) => {},
      checkIn: async (guestData) => {},
      checkOut: async (guestId) => {},
      updateTask: async (taskId, updates) => {},
      approveTask: async (taskId) => {},
      addLaundry: (item) => {},
      moveLaundry: (itemId, stage) => {},
      addInventory: async (item) => {},
      updateInventory: async (id, qty) => {},
      addAnnouncement: async (content, priority) => {},
      addTransaction: async (data) => {},
      generateAIBriefing: async () => {}
    }),
    {
      name: 'hospedapro-v67-env-fix',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.checkConnection();
      },
    }
  )
);
