import type { Category } from '../types/project'

/**
 * МРП на 2026 год — Закон РК от 08.12.2025 № 239-VIII «О республиканском бюджете на 2026–2028 годы».
 * https://adilet.zan.kz/rus/docs/Z2500000239
 */
export const MRP_2026 = 4325
export const MRP_SOURCE = 'https://adilet.zan.kz/rus/docs/Z2500000239'
export const KOAP_SOURCE = 'https://adilet.zan.kz/rus/docs/K1400000235'

export interface RealFine {
  article: string
  title: string
  violation: string
  /** Штраф для физических лиц, МРП. */
  individualMrp: number
  /** Штраф для крупного бизнеса, МРП (если предусмотрен). */
  largeBusinessMrp?: number
  category: Category
  /** Какой проект симулятора снижает число таких нарушений. */
  relatedProject: string
}

/**
 * Реальные административные штрафы по городским темам — Кодекс РК об административных
 * правонарушениях (КоАП РК), тексты статей сверены с официальной редакцией.
 * В расчёт AQLS не входят: показаны для контекста решений.
 */
export const REAL_FINES: RealFine[] = [
  {
    article: 'ст. 592 ч. 2 КоАП РК',
    title: 'Превышение скорости на 20–40 км/ч',
    violation: 'Превышение установленной скорости движения транспортного средства на величину от двадцати до сорока километров в час.',
    individualMrp: 10,
    category: 'safety',
    relatedProject: 'Умные камеры на перекрёстках',
  },
  {
    article: 'ст. 597 ч. 2 КоАП РК',
    title: 'Стоянка на тротуаре, газоне или детской площадке',
    violation: 'Нарушение правил остановки или стоянки на тротуаре, а также на клумбах, газонах, детской или спортивной площадке.',
    individualMrp: 10,
    category: 'transport',
    relatedProject: 'Перехватывающие парковки',
  },
  {
    article: 'ст. 505 ч. 1 КоАП РК',
    title: 'Нарушение правил благоустройства, повреждение зелёных насаждений',
    violation: 'Нарушение правил благоустройства территорий городов, разрушение объектов инфраструктуры, уничтожение и повреждение зелёных насаждений.',
    individualMrp: 20,
    largeBusinessMrp: 100,
    category: 'greening',
    relatedProject: 'Благоустройство дворов',
  },
  {
    article: 'ст. 336 КоАП РК',
    title: 'Сжигание или складирование отходов с нарушениями',
    violation: 'Несоблюдение требований по охране атмосферного воздуха и пожарной безопасности при складировании или сжигании отходов.',
    individualMrp: 20,
    largeBusinessMrp: 500,
    category: 'services',
    relatedProject: 'Оптимизация вывоза отходов',
  },
  {
    article: 'ст. 434 ч. 4 КоАП РК',
    title: 'Осквернение зданий и общественных мест (вандализм)',
    violation: 'Осквернение зданий, иных сооружений, жилых помещений, мест общего пользования, имущества на транспорте и в иных общественных местах.',
    individualMrp: 50,
    category: 'social',
    relatedProject: 'Освещение улиц и дворов',
  },
]

export const mrpToTenge = (mrp: number) => mrp * MRP_2026
