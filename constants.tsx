
import React from 'react';
import { 
  Home, 
  Users, 
  Box, 
  BarChart3, 
  Bed,
  Brush,
  Wind,
  ShieldCheck
} from 'lucide-react';
import { UserRole, RoomCategory } from './types';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
  { id: 'rooms', label: 'Quartos', icon: <Bed size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { id: 'cleaning', label: 'Limpeza', icon: <Brush size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
  { id: 'guests', label: 'Hóspedes', icon: <Users size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { id: 'laundry', label: 'Lavanderia', icon: <Wind size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
  { id: 'inventory', label: 'Estoque', icon: <Box size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { id: 'team', label: 'Equipe', icon: <ShieldCheck size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { id: 'financial', label: 'Financeiro', icon: <BarChart3 size={20} />, roles: [UserRole.ADMIN] },
];

export const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  [RoomCategory.GUEST_ROOM]: [
    "Banheiro: verificar ralos e cabelos no chão",
    "Banheiro: lavagem completa e higienização",
    "Ar Condicionado: verificar e limpar filtros",
    "Parte inferior das camas: verificar lixo e poeira",
    "Lençóis trocados e alinhados",
    "Frigobar: limpo e organizado",
    "Lixos retirados e sacos trocados"
  ],
  'area-cozinha': [
    "Limpeza de bancadas e pias",
    "Limpeza de fogão e microondas",
    "Retirar lixos e trocar sacos",
    "Organizar geladeira comum",
    "Varrer e passar pano no chão"
  ],
  'area-recepcao': [
    "Organizar balcão principal",
    "Varrer e aspirar tapetes",
    "Limpar vidros da entrada",
    "Higienizar máquinas de cartão",
    "Verificar bebedouro/café"
  ],
  'area-escadas': [
    "Varrer todos os degraus",
    "Higienizar corrimão",
    "Retirar teias de aranha dos cantos",
    "Limpar rodapés"
  ],
  'area-laje': [
    "Organizar móveis e cadeiras",
    "Varrer toda a extensão",
    "Verificar focos de água parada",
    "Limpeza de cinzeiros",
    "Verificar iluminação"
  ]
};

export const FATOR_MAMAE_REQUIREMENTS = [
  { id: 'under_bed', label: 'Debaixo da Cama' },
  { id: 'bathroom_drains', label: 'Ralos e Cantos Banheiro' },
  { id: 'ac_filters', label: 'Filtros do Ar Condicionado' },
  { id: 'stairs_corners', label: 'Cantos das Escadas' }
];

export const WHATSAPP_NUMBER = "5521983584197";
