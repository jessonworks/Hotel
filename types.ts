
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff'
}

export enum RoomStatus {
  DISPONIVEL = 'disponivel',
  OCUPADO = 'ocupado',
  SUJO = 'sujo',
  LIMPANDO = 'limpando',
  MANUTENCAO = 'manutencao',
  BLOQUEADO = 'bloqueado'
}

export enum RoomCategory {
  GUEST_ROOM = 'Quarto',
  COMMON_AREA = 'Área Comum'
}

export enum RoomType {
  STANDARD = 'standard',
  DELUXE = 'deluxe',
  SUITE = 'suite',
  AREA = 'area'
}

export enum CleaningStatus {
  PENDENTE = 'pendente',
  EM_PROGRESSO = 'em_progresso',
  AGUARDANDO_APROVACAO = 'aguardando_aprovacao',
  APROVADO = 'aprovado',
  REJEITADO = 'rejeitado'
}

export enum LaundryStage {
  SUJO = 'sujo',
  LAVANDO = 'lavando',
  SECANDO = 'secando',
  GUARDADO = 'guardado'
}

export enum PaymentMethod {
  PIX = 'Pix',
  CREDITO = 'Cartão de Crédito',
  DEBITO = 'Cartão de Débito',
  DINHEIRO = 'Dinheiro'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  password?: string;
  avatarUrl?: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  category: RoomCategory;
  status: RoomStatus;
  maxGuests: number;
  bedsCount: number;
  hasMinibar: boolean;
  hasBalcony: boolean;
  icalUrl?: string;
}

export interface CleaningTask {
  id: string;
  roomId: string;
  assignedTo?: string; 
  assignedByName?: string;
  status: CleaningStatus;
  startedAt?: string; 
  completedAt?: string;
  durationMinutes?: number;
  deadline?: string;
  notes?: string;
  fatorMamaeVerified: boolean;
  bedsToMake: number;
  checklist: { [key: string]: boolean };
  photos: { type: string; url: string; category: 'START' | 'BEFORE' | 'AFTER' | 'MAMAE' }[];
}

export interface LaundryItem {
  id: string;
  type: string;
  quantity: number;
  stage: LaundryStage;
  roomOrigin?: string;
  lastUpdated: string;
}

export interface Guest {
  id: string;
  fullName: string;
  document: string;
  checkIn: string;
  checkOut: string;
  roomId: string;
  checkedOutAt?: string;
  dailyRate: number;
  totalValue: number;
  paymentMethod: PaymentMethod;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  price: number;
  unitCost: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: 'RESERVATION' | 'INVENTORY' | 'MAINTENANCE' | 'LAUNDRY';
  amount: number;
  description: string;
}

export interface Announcement {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  priority: 'low' | 'normal' | 'high';
}
