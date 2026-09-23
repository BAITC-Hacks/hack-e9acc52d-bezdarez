import { Bus, Leaf, Shield, Smartphone, Users } from 'lucide-react'
import type { Category } from '../types/project'

export const CATEGORY_COLORS: Record<Category, string> = {
  transport: '#3987e5',
  greening: '#3fcf3f',
  social: '#c084fc',
  safety: '#fab219',
  services: '#2dd4bf',
}

export const CATEGORY_ICONS = { transport: Bus, greening: Leaf, social: Users, safety: Shield, services: Smartphone }
