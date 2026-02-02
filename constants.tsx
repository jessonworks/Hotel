
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
  { id: 'team', label: 'Equipe (Usuários)', icon: <ShieldCheck size={20} />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  { id: 'financial', label: 'Financeiro', icon: <BarChart3 size={20} />, roles: [UserRole.ADMIN] },
];

// Checklists individuais por categoria ou ID de área
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
    "Cozinha: limpeza de bancadas e pias",
    "Cozinha: limpeza de fogão e microondas",
    "Cozinha: retirar lixos e trocar sacos",
    "Cozinha: organizar geladeira comum",
    "Cozinha: varrer e passar pano no chão"
  ],
  'area-recepcao': [
    "Recepção: organizar balcão principal",
    "Recepção: varrer e aspirar tapetes",
    "Recepção: limpar vidros da entrada",
    "Recepção: higienizar máquinas de cartão",
    "Recepção: verificar bebedouro/café"
  ],
  'area-escadas': [
    "Escadas: varrer todos os degraus",
    "Escadas: higienizar corrimão",
    "Escadas: retirar teias de aranha dos cantos",
    "Escadas: limpar rodapés"
  ],
  'area-laje': [
    "Laje: organizar móveis e cadeiras",
    "Laje: varrer toda a extensão",
    "Laje: verificar se há focos de água parada",
    "Laje: limpeza de cinzeiros (se houver)",
    "Laje: verificar iluminação"
  ]
};

export const FATOR_MAMAE_REQUIREMENTS = [
  { id: 'under_bed', label: 'Debaixo da Cama' },
  { id: 'bathroom_drains', label: 'Ralos e Cantos Banheiro' },
  { id: 'ac_filters', label: 'Filtros do Ar Condicionado' },
  { id: 'stairs_corners', label: 'Cantos das Escadas' }
];

export const WHATSAPP_NUMBER = "5521983584197";
