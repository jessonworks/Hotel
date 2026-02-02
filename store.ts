
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  User, UserRole, Room, RoomStatus, RoomType, RoomCategory,
  CleaningTask, CleaningStatus, LaundryItem, LaundryStage,
  Guest, InventoryItem, Announcement, Transaction
} from './types';
import { CLEANING_CHECKLIST_TEMPLATE } from './constants';

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
  
  login: (email: string, password?: string) => boolean;
  quickLogin: (role: UserRole) => void;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  updateUserPassword: (userId: string, newPassword: string) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  removeUser: (id: string) => void;
  updateRoomStatus: (roomId: string, status: RoomStatus) => void;
  updateRoomICal: (roomId: string, url: string) => void;
  syncICal: (roomId: string) => void;
  createTask: (data: Partial<CleaningTask>) => void;
  updateTask: (taskId: string, updates: Partial<CleaningTask>) => void;
  approveTask: (taskId: string) => void;
  addLaundry: (item: Omit<LaundryItem, 'id' | 'lastUpdated'>) => void;
  moveLaundry: (itemId: string, stage: LaundryStage) => void;
  checkIn: (guest: Omit<Guest, 'id'>) => void;
  checkOut: (guestId: string) => void;
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
  const common = [{ id: 'REC', n: 'Recepção' }, { id: 'COZ', n: 'Cozinha' }];
  common.forEach(c => rooms.push({
    id: c.id, number: c.n, floor: 1, type: RoomType.AREA, category: RoomCategory.COMMON_AREA,
    status: RoomStatus.DISPONIVEL, maxGuests: 0, bedsCount: 0, hasMinibar: false, hasBalcony: false
  }));
  return rooms;
};

const defaultUsers: User[] = [
  { id: 'u1', email: 'admin@hotel.com', role: UserRole.ADMIN, fullName: 'Sr. Admin', password: '123' },
  { id: 'u2', email: 'gerente@hotel.com', role: UserRole.MANAGER, fullName: 'João Gerente', password: '123' },
  { id: 's1', email: 'staff@hotel.com', role: UserRole.STAFF, fullName: 'Maria Staff', password: '123' },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: defaultUsers,
      rooms: generateInitialRooms(),
      tasks: [],
      laundry: [],
      guests: [],
      inventory: [],
      announcements: [{ id: 'a1', authorName: 'Sistema', content: 'HospedaPro Online!', priority: 'normal', createdAt: new Date().toISOString() }],
      transactions: [],

      login: (email, password) => {
        const user = get().users.find(u => u.email === email && u.password === password);
        if (user) { set({ currentUser: user }); return true; }
        return false;
      },
      quickLogin: (role) => set((state) => ({ currentUser: state.users.find(u => u.role === role) || null })),
      logout: () => set({ currentUser: null }),
      updateCurrentUser: (updates) => set((state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
        users: state.users.map(u => u.id === state.currentUser?.id ? { ...u, ...updates } : u)
      })),
      updateUserPassword: (userId, newPassword) => set((state) => ({
        users: state.users.map(u => u.id === userId ? { ...u, password: newPassword } : u),
        currentUser: state.currentUser?.id === userId ? { ...state.currentUser, password: newPassword } : state.currentUser
      })),
      addUser: (userData) => set((state) => ({ users: [...state.users, { ...userData, id: `u-${Date.now()}` }] })),
      removeUser: (id) => set((state) => ({ users: state.users.filter(u => u.id !== id) })),
      updateRoomStatus: (roomId, status) => set((state) => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, status } : r) })),
      updateRoomICal: (roomId, url) => set((state) => ({ rooms: state.rooms.map(r => r.id === roomId ? { ...r, icalUrl: url } : r) })),
      syncICal: (roomId) => set((state) => ({
        rooms: state.rooms.map(r => (r.id === roomId && r.icalUrl) ? { ...r, status: Math.random() > 0.9 ? RoomStatus.OCUPADO : r.status } : r)
      })),
      createTask: (data) => set((state) => ({
        tasks: [...state.tasks, {
          id: `t-${Date.now()}`, roomId: data.roomId!, status: CleaningStatus.PENDENTE,
          fatorMamaeVerified: false, bedsToMake: data.bedsToMake || 0,
          checklist: CLEANING_CHECKLIST_TEMPLATE.reduce((acc, cur) => ({ ...acc, [cur]: false }), {}),
          photos: [], ...data
        } as CleaningTask]
      })),
      updateTask: (taskId, updates) => set((state) => ({ tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) })),
      approveTask: (taskId) => set((state) => {
        const task = state.tasks.find(t => t.id === taskId);
        return {
          tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: CleaningStatus.APROVADO, completedAt: new Date().toISOString() } : t),
          rooms: state.rooms.map(r => r.id === task?.roomId ? { ...r, status: RoomStatus.DISPONIVEL } : r)
        };
      }),
      addLaundry: (item) => set((state) => ({ laundry: [...state.laundry, { ...item, id: `l-${Date.now()}`, lastUpdated: new Date().toISOString() }] })),
      moveLaundry: (itemId, stage) => set((state) => ({ laundry: state.laundry.map(l => l.id === itemId ? { ...l, stage, lastUpdated: new Date().toISOString() } : l) })),
      checkIn: (guestData) => set((state) => ({
        guests: [...state.guests, { ...guestData, id: `g-${Date.now()}` }],
        rooms: state.rooms.map(r => r.id === guestData.roomId ? { ...r, status: RoomStatus.OCUPADO } : r)
      })),
      checkOut: (guestId) => set((state) => {
        const guest = state.guests.find(g => g.id === guestId);
        if (!guest) return state;
        return {
          guests: state.guests.map(g => g.id === guestId ? { ...g, checkedOutAt: new Date().toISOString() } : g),
          rooms: state.rooms.map(r => r.id === guest.roomId ? { ...r, status: RoomStatus.SUJO } : r)
        };
      }),
      addInventory: (item) => set((state) => ({ inventory: [...state.inventory, { ...item, id: `i-${Date.now()}` }] })),
      updateInventory: (id, qty) => set((state) => ({
        inventory: state.inventory.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + qty) } : i)
      })),
      addAnnouncement: (content, priority) => set((state) => ({
        announcements: [{ id: `a-${Date.now()}`, authorName: state.currentUser?.fullName || 'Sistema', content, priority, createdAt: new Date().toISOString() }, ...state.announcements]
      })),
      addTransaction: (data) => set((state) => ({ transactions: [{ ...data, id: `tr-${Date.now()}`, date: new Date().toISOString() }, ...state.transactions] })),
      resetData: () => set({ rooms: generateInitialRooms(), tasks: [], laundry: [], guests: [], inventory: [], transactions: [] })
    }),
    {
      name: 'hospedapro-storage-vfinal',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
