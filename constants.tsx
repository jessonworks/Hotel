
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
import { UserRole } from './types';

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

export const CLEANING_CHECKLIST_TEMPLATE = [
  "Banheiro: verificar ralos e cabelos no chão",
  "Banheiro: lavagem completa e higienização",
  "Ar Condicionado: verificar e limpar filtros",
  "Parte inferior das camas: verificar lixo e poeira",
  "Recepção: varrer e aspirar",
  "Escadas: varrer e passar pano",
  "Terraço: organizar cadeiras e limpeza",
  "Cozinha: limpeza geral e superfícies",
  "Laje: organizar e varrer",
  "Lençóis trocados e alinhados",
  "Frigobar: limpo e organizado",
  "Lixos retirados e sacos trocados"
];

export const FATOR_MAMAE_REQUIREMENTS = [
  { id: 'under_bed', label: 'Debaixo da Cama' },
  { id: 'bathroom_drains', label: 'Ralos e Cantos Banheiro' },
  { id: 'ac_filters', label: 'Filtros do Ar Condicionado' },
  { id: 'stairs_corners', label: 'Cantos das Escadas' }
];

export const WHATSAPP_NUMBER = "5521983584197";
