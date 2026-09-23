import type { Lang } from '../../lib/i18n'

const ru = {
  layer: 'Слой карты', view: 'Вид карты', districts: 'Районы', city: 'Карта города · 2ГИС',
  schemaTitle: 'Схема районов', schema: 'Схема', brand: '2ГИС',
  unavailable: '2ГИС сейчас недоступен. Показана схема районов; повторить загрузку можно кнопкой «2ГИС».',
  contours: ' Контуры поверх 2ГИС — существующая упрощённая схема приложения с приблизительной геопривязкой.',
  relative: 'Относительно среднего по городу', region: 'Карта Астаны, 2ГИС',
  loading: 'Загружаю карту 2ГИС…', all: 'Все районы',
  touch: 'На телефоне двигайте карту двумя пальцами. Показатели районов — модельные.',
}

export const MAP_COPY: Record<Lang, Record<keyof typeof ru, string>> = {
  ru,
  kk: {
    layer: 'Карта қабаты', view: 'Карта көрінісі', districts: 'Аудандар', city: 'Қала картасы · 2GIS',
    schemaTitle: 'Аудандар сызбасы', schema: 'Сызба', brand: '2GIS',
    unavailable: '2GIS қазір қолжетімсіз. Аудандар сызбасы көрсетілді. Картаны қайта жүктеу үшін «2GIS» батырмасын басыңыз.',
    contours: ' 2GIS картасындағы аудан шекаралары қолданбадағы жеңілдетілген сызбаға негізделген, географиялық орны жуықтап көрсетілген.',
    relative: 'Қаланың орташа көрсеткішімен салыстыру', region: 'Астана картасы, 2GIS',
    loading: '2GIS картасы жүктеліп жатыр…', all: 'Барлық аудандар',
    touch: 'Телефонда картаны екі саусақпен жылжытыңыз. Аудан көрсеткіштері модель бойынша есептелген.',
  },
  en: {
    layer: 'Map layer', view: 'Map view', districts: 'Districts', city: 'City map · 2GIS',
    schemaTitle: 'District diagram', schema: 'Diagram', brand: '2GIS',
    unavailable: '2GIS is currently unavailable. The district diagram is shown. Select “2GIS” to try loading the map again.',
    contours: ' District outlines over 2GIS use the app’s simplified diagram with approximate geographic alignment.',
    relative: 'Compared with the city average', region: 'Map of Astana, 2GIS',
    loading: 'Loading the 2GIS map…', all: 'All districts',
    touch: 'On a phone, move the map with two fingers. District indicators are simulated.',
  },
}
