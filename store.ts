
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

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
  const commonAreas = [{ id: 'area-cozinha', name: 'Cozinha' }, { id: 'area-recepcao', name: 'Recepção' }, { id: 'area-escadas', name: 'Escadas' }, { id: 'area-laje', name: 'Laje' }];
  commonAreas.forEach(a => rooms.push({ id: a.id, number: a.name, floor: 0, type: RoomType.AREA, category: RoomCategory.COMMON_AREA, status: RoomStatus.DISPONIVEL, maxGuests: 0, bedsCount: 0, hasMinibar: false, hasBalcony: false }));
  return rooms;
};

const INITIAL_USERS: User[] = [
  { id: 'u1', email: 'admin@hotel.com', fullName: 'Gerente Operacional', role: UserRole.ADMIN, password: 'hotel2024' },
  { id: 'u2', email: 'limpeza1@hotel.com', fullName: 'Karine Staff', role: UserRole.STAFF, password: '123456' },
  { id: 'u3', email: 'gerente@hotel.com', fullName: 'Gerente de Plantão', role: UserRole.MANAGER, password: 'gerente123' }
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: INITIAL_USERS,
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
        if (!supabase) return;
        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          if (error) throw error;
          set({ isSupabaseConnected: true });
          if (get().currentUser) get().syncData();
        } catch (err) {
          set({ isSupabaseConnected: false });
        }
      },

      syncData: async () => {
        if (!supabase) return;
        try {
          const [ { data: roomsData }, { data: tasksData }, { data: usersData } ] = await Promise.all([
            supabase.from('rooms').select('*'),
            supabase.from('tasks').select('*'),
            supabase.from('users').select('*')
          ]);
          
          if (usersData?.length) {
            set({ users: usersData.map(u => ({ 
              id: u.id, email: u.email, fullName: u.full_name, role: u.role, password: u.password 
            }))});
          }

          if (roomsData?.length) {
            set({ rooms: roomsData.map(r => ({ 
              id: r.id, number: r.number, floor: r.floor, type: r.type, category: r.category, status: r.status, 
              maxGuests: r.max_guests, bedsCount: r.beds_count || 0, hasMinibar: r.has_minibar, hasBalcony: r.has_balcony, icalUrl: r.ical_url 
            }))});
          }

          if (tasksData) {
            set({ tasks: tasksData.map(t => ({ 
              id: t.id, roomId: t.room_id, assignedTo: t.assigned_to, assignedByName: t.assigned_by_name, 
              status: t.status, startedAt: t.started_at, completedAt: t.completed_at, durationMinutes: t.duration_minutes, 
              deadline: t.deadline, notes: t.notes, fatorMamaeVerified: t.fator_mamae_verified, bedsToMake: t.beds_to_make, 
              checklist: t.checklist || {}, photos: t.photos || [] 
            }))});
          }
        } catch (e) { console.error("Sync Error:", e); }
      },

      login: async (email, password) => {
        if (supabase) {
           const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).eq('password', password).single();
           if (data && !error) {
             set({ currentUser: { id: data.id, email: data.email, fullName: data.full_name, role: data.role, password: data.password }, isDemoMode: false });
             get().syncData();
             return true;
           }
        }
        const localUser = INITIAL_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (localUser) {
           set({ currentUser: localUser, isDemoMode: true });
           return true;
        }
        return false;
      },

      updateRoomStatus: async (roomId, status) => {
        set(state => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, status } : r) }));
        if (supabase && !get().isDemoMode) {
          await supabase.from('rooms').update({ status }).eq('id', roomId);
        }
      },

      createTask: async (data) => {
        const id = `t-${Date.now()}`;
        const room = get().rooms.find(r => r.id === data.roomId);
        const assignedUser = get().users.find(u => u.id === data.assignedTo);
        const template = CHECKLIST_TEMPLATES[data.roomId!] || CHECKLIST_TEMPLATES[room?.category!] || CHECKLIST_TEMPLATES[RoomCategory.GUEST_ROOM];
        const initialChecklist = template.reduce((acc, cur) => ({ ...acc, [cur]: false }), {});
        
        const newTask: CleaningTask = { 
          id, roomId: data.roomId!, assignedTo: data.assignedTo, assignedByName: assignedUser?.fullName || 'Colaborador', 
          status: CleaningStatus.PENDENTE, deadline: data.deadline, notes: data.notes, bedsToMake: room?.bedsCount || 0, 
          checklist: initialChecklist, photos: [], fatorMamaeVerified: false 
        };

        set(state => ({ 
          tasks: [...state.tasks, newTask], 
          rooms: state.rooms.map(r => r.id === data.roomId ? { ...r, status: RoomStatus.LIMPANDO } : r) 
        }));

        if (supabase && !get().isDemoMode) {
          await supabase.from('tasks').insert({
            id: newTask.id, room_id: newTask.roomId, assigned_to: newTask.assignedTo, assigned_by_name: newTask.assignedByName,
            status: newTask.status, deadline: newTask.deadline, notes: newTask.notes, beds_to_make: newTask.bedsToMake,
            checklist: newTask.checklist, photos: newTask.photos
          });
          await supabase.from('rooms').update({ status: RoomStatus.LIMPANDO }).eq('id', data.roomId);
        }
      },

      updateTask: async (taskId, updates) => {
        set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }));
        if (supabase && !get().isDemoMode) {
          await supabase.from('tasks').update({
            status: updates.status, checklist: updates.checklist, photos: updates.photos, 
            started_at: updates.startedAt, completed_at: updates.completedAt, duration_minutes: updates.durationMinutes
          }).eq('id', taskId);
        }
      },

      approveTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;
        
        set(state => ({ 
          tasks: state.tasks.filter(t => t.id !== taskId), // Remove da lista de pendentes localmente
          rooms: state.rooms.map(r => r.id === task.roomId ? { ...r, status: RoomStatus.DISPONIVEL } : r) 
        }));

        if (supabase && !get().isDemoMode) {
          await Promise.all([
            supabase.from('tasks').update({ status: CleaningStatus.APROVADO }).eq('id', taskId),
            supabase.from('rooms').update({ status: RoomStatus.DISPONIVEL }).eq('id', task.roomId)
          ]);
          get().syncData(); // Força resync para garantir que sumiu do banco
        }
      },

      enterDemoMode: (role, specificUser) => {
        const existing = INITIAL_USERS.find(u => u.email === specificUser?.email || u.role === role);
        set({ currentUser: existing || null, isDemoMode: true });
      },

      logout: () => set({ currentUser: null, isDemoMode: false }),
      resetData: () => set({ rooms: generateInitialRooms(), tasks: [], laundry: [], guests: [], inventory: [], transactions: [] }),
      syncICal: async (roomId) => { console.log("Sync iCal:", roomId); },
      addLaundry: (item) => set((state) => ({ laundry: [...state.laundry, { ...item, id: `l-${Date.now()}`, lastUpdated: new Date().toISOString() }] })),
      moveLaundry: (itemId, stage) => set((state) => ({ laundry: state.laundry.map(l => l.id === itemId ? { ...l, stage, lastUpdated: new Date().toISOString() } : l) })),
      addUser: async (userData) => { const id = `u-${Date.now()}`; set(state => ({ users: [...state.users, { ...userData, id }] })); },
      removeUser: async (id) => { set(state => ({ users: state.users.filter(u => u.id !== id) })); },
      addTransaction: async (data) => { set(state => ({ transactions: [{ ...data, id: `tr-${Date.now()}`, date: new Date().toISOString() }, ...state.transactions] })); },
      addInventory: async (item) => { set(state => ({ inventory: [...state.inventory, { ...item, id: `i-${Date.now()}` }] })); },
      updateInventory: async (id, qty) => { set(state => ({ inventory: state.inventory.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + qty) } : i) })); },
      addAnnouncement: async (content, priority) => { set(state => ({ announcements: [{ id: `a-${Date.now()}`, authorName: get().currentUser?.fullName || 'Sistema', content, priority, createdAt: new Date().toISOString() }, ...state.announcements] })); },
      checkIn: async (data) => { set(state => ({ guests: [...state.guests, { ...data, id: `g-${Date.now()}` }], rooms: state.rooms.map(r => r.id === data.roomId ? { ...r, status: RoomStatus.OCUPADO } : r) })); },
      checkOut: async (id) => { const g = get().guests.find(g => g.id === id); if (!g) return; set(state => ({ guests: state.guests.map(x => x.id === id ? { ...x, checkedOutAt: new Date().toISOString() } : x), rooms: state.rooms.map(r => r.id === g.roomId ? { ...r, status: RoomStatus.SUJO } : r) })); },
      updateCurrentUser: async (upd) => { if (get().currentUser) set({ currentUser: { ...get().currentUser!, ...upd } }); },
      updateUserPassword: async (id, p) => { set(state => ({ users: state.users.map(u => u.id === id ? { ...u, password: p } : u) })); },
      generateAIBriefing: async () => { set({ managerBriefing: "Hotel operando normalmente." }); }
    }),
    {
      name: 'hospedapro-v95-stable-prod',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => { state?.checkConnection(); },
    }
  )
);
