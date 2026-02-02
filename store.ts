
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

// Referências que o Vite substituirá por strings reais durante o build na Vercel
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
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          set({ isSupabaseConnected: false, connectionError: 'Configurando chaves...' });
          return;
        }
        
        if (!supabase) {
          set({ isSupabaseConnected: false, connectionError: 'Erro de Init Supabase' });
          return;
        }

        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          if (error) throw error;
          set({ isSupabaseConnected: true, connectionError: null });
          if (!get().isDemoMode && get().currentUser) get().syncData();
        } catch (err: any) {
          set({ isSupabaseConnected: false, connectionError: 'Falha de Conexão' });
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

          // Somente sobrescreve os quartos se houver dados no banco
          if (roomsData && roomsData.length > 0) {
            set({ rooms: roomsData.map(r => ({
              id: r.id, number: r.number, floor: r.floor, type: r.type, category: r.category,
              status: r.status, maxGuests: r.max_guests, bedsCount: r.beds_count,
              hasMinibar: r.has_minibar, hasBalcony: r.has_balcony, icalUrl: r.ical_url
            }))});
          }
          
          if (usersData && usersData.length > 0) {
             set({ users: usersData.map(u => ({
              id: u.id, email: u.email, fullName: u.full_name, role: inferRoleByEmail(u.email),
              password: u.password, avatarUrl: u.avatar_url
            }))});
          }
          
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
            id: data.id, email: data.email, fullName: data.full_name, 
            role: inferRoleByEmail(data.email), avatarUrl: data.avatar_url, password: data.password 
          };
          set({ currentUser: user, isDemoMode: false });
          get().syncData();
          return true;
        }
        return false;
      },

      updateCurrentUser: async (updates) => {
        const user = get().currentUser;
        if (!user) return;
        if (!get().isDemoMode && supabase) {
          await supabase.from('users').update({ 
            full_name: updates.fullName, 
            avatar_url: updates.avatarUrl, 
            email: updates.email 
          }).eq('id', user.id);
          get().syncData();
        } else {
          set({ currentUser: { ...user, ...updates } });
        }
      },

      updateUserPassword: async (userId, newPassword) => {
        if (!get().isDemoMode && supabase) {
          await supabase.from('users').update({ password: newPassword }).eq('id', userId);
          get().syncData();
        }
      },

      addUser: async (userData) => {
        const id = `u-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('users').insert({ 
            id, email: userData.email, full_name: userData.fullName, 
            password: userData.password, role: userData.role 
          });
          get().syncData();
        } else {
          set(state => ({ users: [...state.users, { ...userData, id }] }));
        }
      },

      removeUser: async (id) => {
        if (!get().isDemoMode && supabase) {
          await supabase.from('users').delete().eq('id', id);
          get().syncData();
        } else {
          set(state => ({ users: state.users.filter(u => u.id !== id) }));
        }
      },

      updateRoomStatus: async (roomId, status) => {
        if (supabase && !get().isDemoMode) {
          // Garante que o quarto existe no banco antes de atualizar status
          const room = get().rooms.find(r => r.id === roomId);
          if (room) {
            await supabase.from('rooms').upsert({ 
              id: roomId, 
              status,
              number: room.number,
              floor: room.floor,
              category: room.category,
              type: room.type,
              max_guests: room.maxGuests,
              beds_count: room.bedsCount,
              has_minibar: room.hasMinibar,
              has_balcony: room.hasBalcony
            });
          }
          get().syncData();
        } else {
          set(state => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, status } : r) }));
        }
      },

      updateRoomICal: async (roomId, url) => {
        if (!get().isDemoMode && supabase) {
          await supabase.from('rooms').upsert({ id: roomId, ical_url: url });
          get().syncData();
        }
      },

      syncICal: async (roomId) => {
        get().syncData();
      },

      checkIn: async (guestData) => {
        const id = `g-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('guests').insert({ 
            id, full_name: guestData.fullName, document: guestData.document, 
            room_id: guestData.roomId, check_in: guestData.checkIn, 
            check_out: guestData.checkOut, total_value: guestData.totalValue, 
            payment_method: guestData.paymentMethod, daily_rate: guestData.dailyRate 
          });
          await supabase.from('rooms').update({ status: RoomStatus.OCUPADO }).eq('id', guestData.roomId);
          await supabase.from('transactions').insert({
            id: `tr-${id}`, date: new Date().toISOString(), type: 'INCOME',
            category: 'RESERVATION', amount: guestData.totalValue, 
            description: `Reserva: ${guestData.fullName} (Unid. ${guestData.roomId})`
          });
          get().syncData();
        } else {
          set(state => ({
            guests: [...state.guests, { ...guestData, id }],
            rooms: state.rooms.map(r => r.id === guestData.roomId ? { ...r, status: RoomStatus.OCUPADO } : r)
          }));
        }
      },

      checkOut: async (guestId) => {
        const guest = get().guests.find(g => g.id === guestId);
        if (!guest) return;
        if (!get().isDemoMode && supabase) {
          await supabase.from('guests').update({ checked_out_at: new Date().toISOString() }).eq('id', guestId);
          await supabase.from('rooms').update({ status: RoomStatus.SUJO }).eq('id', guest.roomId);
          get().syncData();
        } else {
          set(state => ({
            guests: state.guests.map(g => g.id === guestId ? { ...g, checkedOutAt: new Date().toISOString() } : g),
            rooms: state.rooms.map(r => r.id === guest.roomId ? { ...r, status: RoomStatus.SUJO } : r)
          }));
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
            notes: data.notes, beds_to_make: data.beds_to_make || 0,
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

      updateTask: async (taskId, updates) => {
        if (!get().isDemoMode && supabase) {
          await supabase.from('tasks').update({
            status: updates.status, checklist: updates.checklist, 
            photos: updates.photos, started_at: updates.startedAt,
            completed_at: updates.completedAt, duration_minutes: updates.durationMinutes
          }).eq('id', taskId);
          get().syncData();
        } else {
          set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }));
        }
      },

      approveTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;
        if (!get().isDemoMode && supabase) {
          await supabase.from('tasks').update({ status: CleaningStatus.APROVADO }).eq('id', taskId);
          await supabase.from('rooms').update({ status: RoomStatus.DISPONIVEL }).eq('id', task.roomId);
          get().syncData();
        } else {
          set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: CleaningStatus.APROVADO } : t),
            rooms: state.rooms.map(r => r.id === task.roomId ? { ...r, status: RoomStatus.DISPONIVEL } : r)
          }));
        }
      },

      addLaundry: (item) => set((state) => ({ laundry: [...state.laundry, { ...item, id: `l-${Date.now()}`, lastUpdated: new Date().toISOString() }] })),
      moveLaundry: (itemId, stage) => set((state) => ({ laundry: state.laundry.map(l => l.id === itemId ? { ...l, stage, lastUpdated: new Date().toISOString() } : l) })),
      
      addInventory: async (item) => {
        const id = `i-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('inventory').insert({ 
            id, name: item.name, category: item.category, 
            quantity: item.quantity, min_stock: item.min_stock, unit_cost: item.unitCost 
          });
          get().syncData();
        } else {
          set(state => ({ inventory: [...state.inventory, { ...item, id }] }));
        }
      },

      updateInventory: async (id, qty) => {
        const item = get().inventory.find(i => i.id === id);
        if (!item) return;
        if (!get().isDemoMode && supabase) {
          await supabase.from('inventory').update({ quantity: Math.max(0, item.quantity + qty) }).eq('id', id);
          get().syncData();
        } else {
          set(state => ({ inventory: state.inventory.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + qty) } : i) }));
        }
      },

      addAnnouncement: async (content, priority) => {
        const id = `a-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('announcements').insert({ 
            id, author_name: get().currentUser?.fullName || 'Sistema', 
            content, priority, created_at: new Date().toISOString() 
          });
          get().syncData();
        } else {
          set(state => ({ announcements: [{ id, authorName: get().currentUser?.fullName || 'Sistema', content, priority, createdAt: new Date().toISOString() }, ...state.announcements] }));
        }
      },

      addTransaction: async (data) => {
        const id = `tr-${Date.now()}`;
        if (!get().isDemoMode && supabase) {
          await supabase.from('transactions').insert({ 
            id, date: new Date().toISOString(), type: data.type, 
            category: data.category, amount: data.amount, description: data.description 
          });
          get().syncData();
        } else {
          set(state => ({ transactions: [{ ...data, id, date: new Date().toISOString() }, ...state.transactions] }));
        }
      },

      generateAIBriefing: async () => {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Gere um briefing de 3 frases para o gerente do hotel. Status: ${get().rooms.filter(r => r.status === RoomStatus.OCUPADO).length} quartos ocupados, ${get().tasks.filter(t => t.status === CleaningStatus.PENDENTE).length} faxinas pendentes.`
          });
          set({ managerBriefing: response.text });
        } catch (e) {
          console.error("AI Error:", e);
        }
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
      resetData: () => set({ rooms: generateInitialRooms(), tasks: [], laundry: [], guests: [], inventory: [], transactions: [] })
    }),
    {
      name: 'hospedapro-v73-stable-roles',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.checkConnection();
      },
    }
  )
);
