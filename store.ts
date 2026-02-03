
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction
} from './types';
import { CHECKLIST_TEMPLATES } from './constants';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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
  connectionError: string | null;
  managerBriefing: string | null;
  
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  uploadFile: (file: File | string, path: string) => Promise<string | null>;
  
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
  ['101', '102', '103', '104', '201', '202', '203', '204', '205', '301', '302', '303', '304', '305', '306'].forEach(n => rooms.push({
    id: n, number: n, floor: parseInt(n[0]), type: RoomType.STANDARD, category: RoomCategory.GUEST_ROOM,
    status: RoomStatus.DISPONIVEL, maxGuests: 2, bedsCount: 2, hasMinibar: true, hasBalcony: n[0] !== '1'
  }));
  const commonAreas = [
    { id: 'area-cozinha', name: 'Cozinha' },
    { id: 'area-recepcao', name: 'Recepção' },
    { id: 'area-escadas', name: 'Escadas' },
    { id: 'area-laje', name: 'Laje' }
  ];
  commonAreas.forEach(a => rooms.push({ id: a.id, number: a.name, floor: 0, type: RoomType.AREA, category: RoomCategory.COMMON_AREA, status: RoomStatus.DISPONIVEL, maxGuests: 0, bedsCount: 0, hasMinibar: false, hasBalcony: false }));
  return rooms;
};

const INITIAL_USERS: User[] = [
  { id: 'u-dev', email: 'dev@hotel.com', fullName: 'Dev (Sistema)', role: UserRole.ADMIN, password: 'dev' },
  { id: 'u-jeff', email: 'jeff@hotel.com', fullName: 'Jeff', role: UserRole.ADMIN, password: 'jeff123' },
  { id: 'u-rose', email: 'rose@hotel.com', fullName: 'Rose', role: UserRole.STAFF, password: 'rose123' },
  { id: 'u-joao', email: 'joao@hotel.com', fullName: 'João', role: UserRole.STAFF, password: 'joao' }
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
      connectionError: null,
      managerBriefing: null,

      uploadFile: async (file, path) => {
        if (!supabase) return null;
        try {
          let fileBody: any = file;
          // Se for base64, converter para Blob
          if (typeof file === 'string' && file.startsWith('data:')) {
            const res = await fetch(file);
            fileBody = await res.blob();
          }
          
          const { data, error } = await supabase.storage
            .from('hospedapro')
            .upload(path, fileBody, { upsert: true });

          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('hospedapro').getPublicUrl(data.path);
          return publicUrl;
        } catch (e) {
          console.error("Upload Error:", e);
          return null;
        }
      },

      checkConnection: async () => {
        if (!supabase) {
          set({ isSupabaseConnected: false, connectionError: 'Offline' });
          return;
        }
        try {
          const { error } = await supabase.from('users').select('id').limit(1);
          if (error) throw error;
          set({ isSupabaseConnected: true, connectionError: null });
          if (get().currentUser) get().syncData();
        } catch (err) {
          set({ isSupabaseConnected: false, connectionError: 'Erro de Conexão' });
        }
      },

      syncData: async () => {
        if (!supabase) return;
        try {
          const [ { data: roomsData }, { data: tasksData }, { data: usersData } ] = await Promise.all([
            supabase.from('rooms').select('*'),
            supabase.from('tasks').select('*').not('status', 'eq', 'aprovado'),
            supabase.from('users').select('*')
          ]);
          
          if (usersData?.length) {
            set({ users: (usersData as any[]).map(u => ({ 
              id: u.id, email: u.email, fullName: u.full_name, role: u.role, password: u.password, avatarUrl: u.avatar_url 
            }))});
          }

          if (roomsData?.length) {
            set({ rooms: (roomsData as any[]).map(r => ({ 
              id: r.id, number: r.number, floor: r.floor, type: r.type, category: r.category, status: r.status, maxGuests: r.max_guests, bedsCount: r.beds_count || 0, hasMinibar: r.has_minibar, hasBalcony: r.has_balcony 
            }))});
          }

          if (tasksData) {
            set({ tasks: (tasksData as any[]).map(t => ({ 
              id: t.id, roomId: t.room_id, assignedTo: t.assigned_to, assignedByName: t.assigned_by_name, status: t.status as CleaningStatus, startedAt: t.started_at, completedAt: t.completed_at, durationMinutes: t.duration_minutes, deadline: t.deadline, notes: t.notes, fatorMamaeVerified: t.fator_mamae_verified, bedsToMake: t.beds_to_make, checklist: t.checklist || {}, photos: t.photos || [] 
            }))});
          }
        } catch (e) { console.error("Sync Error:", e); }
      },

      login: async (email, password) => {
        const lowerEmail = email.toLowerCase();
        
        if (supabase) {
           try {
             const { data, error } = await supabase.from('users').select('*').eq('email', lowerEmail).eq('password', password).single();
             if (data && !error) {
               set({ currentUser: { id: data.id, email: data.email, fullName: data.full_name, role: data.role, password: data.password, avatarUrl: data.avatar_url } });
               await get().syncData();
               return true;
             }
           } catch(e) {}
        }

        const localUser = get().users.find(u => u.email.toLowerCase() === lowerEmail && u.password === password);
        if (localUser) {
          set({ currentUser: localUser });
          // Se estamos online mas o usuário só existe localmente, vamos subir ele para o banco
          if (supabase) {
            await supabase.from('users').upsert({
              id: localUser.id,
              email: localUser.email,
              full_name: localUser.fullName,
              role: localUser.role,
              password: localUser.password
            });
          }
          return true;
        }
        return false;
      },

      updateCurrentUser: async (upd) => {
        const user = get().currentUser;
        if (!user) return;
        
        let finalUpd = { ...upd };
        if (upd.avatarUrl && upd.avatarUrl.startsWith('data:')) {
          const url = await get().uploadFile(upd.avatarUrl, `avatars/${user.id}.jpg`);
          if (url) finalUpd.avatarUrl = url;
        }

        set({ currentUser: { ...user, ...finalUpd } });
        if (supabase) {
          await supabase.from('users').update({ 
            full_name: finalUpd.fullName || user.fullName,
            email: finalUpd.email || user.email,
            avatar_url: finalUpd.avatarUrl || user.avatarUrl
          }).eq('id', user.id);
        }
      },

      updateTask: async (taskId, updates) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        let finalPhotos = updates.photos || task.photos;
        
        // Se houver fotos novas em base64, fazer upload para o Storage
        if (updates.photos && supabase) {
          const uploadedPhotos = await Promise.all(updates.photos.map(async (p, idx) => {
            if (p.url.startsWith('data:')) {
              const path = `tasks/${taskId}/${p.category}_${idx}.jpg`;
              const url = await get().uploadFile(p.url, path);
              return { ...p, url: url || p.url };
            }
            return p;
          }));
          finalPhotos = uploadedPhotos;
        }

        const finalUpdates = { ...updates, photos: finalPhotos };
        set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...finalUpdates } : t) }));
        
        if (supabase) {
          await supabase.from('tasks').update({
            status: finalUpdates.status || task.status,
            checklist: finalUpdates.checklist || task.checklist,
            photos: finalPhotos, 
            started_at: finalUpdates.startedAt || task.startedAt,
            completed_at: finalUpdates.completedAt || task.completedAt,
            duration_minutes: finalUpdates.durationMinutes || task.durationMinutes
          }).eq('id', taskId);
        }
      },

      updateRoomStatus: async (roomId, status) => {
        set(state => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, status } : r) }));
        if (supabase) {
          await supabase.from('rooms').update({ status }).eq('id', roomId);
        }
      },

      createTask: async (data) => {
        const existing = get().tasks.find(t => t.roomId === data.roomId && t.status !== CleaningStatus.APROVADO);
        if (existing) return;

        const id = `t-${Date.now()}`;
        const room = get().rooms.find(r => r.id === data.roomId);
        const assignedUser = get().users.find(u => u.id === data.assignedTo);
        const template = CHECKLIST_TEMPLATES[data.roomId!] || CHECKLIST_TEMPLATES[room?.category!] || CHECKLIST_TEMPLATES[RoomCategory.GUEST_ROOM];
        
        const newTask: CleaningTask = { 
          id, roomId: data.roomId!, assignedTo: data.assignedTo, assignedByName: assignedUser?.fullName || 'Staff', 
          status: CleaningStatus.PENDENTE, deadline: data.deadline, notes: data.notes, bedsToMake: room?.bedsCount || 0, 
          checklist: template.reduce((acc, cur) => ({ ...acc, [cur]: false }), {}), photos: [], fatorMamaeVerified: false 
        };

        set(state => ({ 
          tasks: [...state.tasks, newTask], 
          rooms: state.rooms.map(r => r.id === data.roomId ? { ...r, status: RoomStatus.LIMPANDO } : r) 
        }));

        if (supabase) {
          await supabase.from('tasks').insert({
            id: newTask.id, room_id: newTask.roomId, assigned_to: newTask.assignedTo, assigned_by_name: newTask.assignedByName,
            status: newTask.status, deadline: newTask.deadline, notes: newTask.notes, beds_to_make: newTask.bedsToMake,
            checklist: newTask.checklist, photos: newTask.photos
          });
          await supabase.from('rooms').update({ status: RoomStatus.LIMPANDO }).eq('id', data.roomId);
        }
      },

      approveTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;
        
        set(state => ({ 
          tasks: state.tasks.filter(t => t.id !== taskId),
          rooms: state.rooms.map(r => r.id === task.roomId ? { ...r, status: RoomStatus.DISPONIVEL } : r) 
        }));

        if (supabase) {
          await Promise.all([
            supabase.from('tasks').update({ status: CleaningStatus.APROVADO }).eq('id', taskId),
            supabase.from('rooms').update({ status: RoomStatus.DISPONIVEL }).eq('id', task.roomId)
          ]);
          get().syncData();
        }
      },

      logout: () => set({ currentUser: null, tasks: [] }),
      resetData: () => set({ rooms: generateInitialRooms(), tasks: [], laundry: [], guests: [], inventory: [], transactions: [], users: INITIAL_USERS }),
      syncICal: async (roomId) => { console.log("iCal:", roomId); },
      addLaundry: (item) => set((state) => ({ laundry: [...state.laundry, { ...item, id: `l-${Date.now()}`, lastUpdated: new Date().toISOString() }] })),
      moveLaundry: (itemId, stage) => set((state) => ({ laundry: state.laundry.map(l => l.id === itemId ? { ...l, stage, lastUpdated: new Date().toISOString() } : l) })),
      addUser: async (userData) => { 
        const id = `u-${Date.now()}`; 
        set(state => ({ users: [...state.users, { ...userData, id }] }));
        if (supabase) {
          await supabase.from('users').insert({
            id, email: userData.email, full_name: userData.fullName, role: userData.role, password: userData.password
          });
        }
      },
      removeUser: async (id) => { 
        set(state => ({ users: state.users.filter(u => u.id !== id) }));
        if (supabase) {
          await supabase.from('users').delete().eq('id', id);
        }
      },
      addTransaction: async (data) => { 
        const id = `tr-${Date.now()}`;
        const date = new Date().toISOString();
        set(state => ({ transactions: [{ ...data, id, date }, ...state.transactions] }));
        if (supabase) {
          await supabase.from('transactions').insert({
            id, date, type: data.type, category: data.category, amount: data.amount, description: data.description
          });
        }
      },
      addInventory: async (item) => { 
        const id = `i-${Date.now()}`;
        set(state => ({ inventory: [...state.inventory, { ...item, id }] }));
        if (supabase) {
          await supabase.from('inventory').insert({
            id, name: item.name, category: item.category, quantity: item.quantity, min_stock: item.minStock, price: item.price, unit_cost: item.unitCost
          });
        }
      },
      updateInventory: async (id, qty) => { 
        set(state => ({ inventory: state.inventory.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + qty) } : i) }));
        if (supabase) {
          const item = get().inventory.find(i => i.id === id);
          if (item) await supabase.from('inventory').update({ quantity: item.quantity }).eq('id', id);
        }
      },
      addAnnouncement: async (content, priority) => { 
        const id = `a-${Date.now()}`;
        const createdAt = new Date().toISOString();
        const authorName = get().currentUser?.fullName || 'Sistema';
        set(state => ({ announcements: [{ id, authorName, content, priority, createdAt }, ...state.announcements] }));
        if (supabase) {
          await supabase.from('announcements').insert({ id, author_name: authorName, content, priority, created_at: createdAt });
        }
      },
      checkIn: async (data) => { 
        const id = `g-${Date.now()}`;
        set(state => ({ guests: [...state.guests, { ...data, id }], rooms: state.rooms.map(r => r.id === data.roomId ? { ...r, status: RoomStatus.OCUPADO } : r) }));
        if (supabase) {
          await Promise.all([
            supabase.from('guests').insert({ id, full_name: data.fullName, document: data.document, check_in: data.checkIn, check_out: data.checkOut, room_id: data.roomId, daily_rate: data.dailyRate, total_value: data.totalValue, payment_method: data.paymentMethod }),
            supabase.from('rooms').update({ status: RoomStatus.OCUPADO }).eq('id', data.roomId)
          ]);
        }
      },
      checkOut: async (id) => { 
        const g = get().guests.find(g => g.id === id); 
        if (!g) return; 
        const checkedOutAt = new Date().toISOString();
        set(state => ({ guests: state.guests.map(x => x.id === id ? { ...x, checkedOutAt } : x), rooms: state.rooms.map(r => r.id === g.roomId ? { ...r, status: RoomStatus.SUJO } : r) })); 
        if (supabase) {
          await Promise.all([
            supabase.from('guests').update({ checked_out_at: checkedOutAt }).eq('id', id),
            supabase.from('rooms').update({ status: RoomStatus.SUJO }).eq('id', g.roomId)
          ]);
        }
      },
      updateUserPassword: async (id, p) => { 
        set(state => ({ users: state.users.map(u => u.id === id ? { ...u, password: p } : u) })); 
        if (supabase) {
          await supabase.from('users').update({ password: p }).eq('id', id);
        }
      },
      generateAIBriefing: async () => { set({ managerBriefing: "Briefing gerado com sucesso." }); },
      updateRoomICal: async (roomId, url) => {
        set(state => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, icalUrl: url } : r) }));
        if (supabase) {
          await supabase.from('rooms').update({ ical_url: url }).eq('id', roomId);
        }
      }
    }),
    {
      name: 'hospedapro-v3-final',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => { state?.checkConnection(); },
    }
  )
);
