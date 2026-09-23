import { fmtTenge } from '../../lib/format'
import type { Lang } from '../../lib/i18n'

const TARGETS = [undefined, 'categories', 'projects', 'slider', 'forecast', 'budget', 'assistant', 'settings'] as const

export function getTourSteps(lang: Lang) {
  const copy: Record<Lang, [string, string][]> = {
    ru: [
      ['Привет! Я AI-помощник QalaBalance', `За минуту покажу, как управлять городом. У вас 100 бюджетных единиц — это ${fmtTenge(100, lang)}. Задача — поднять качество жизни (AQLS) и сохранить баланс.`],
      ['Пять сфер города', 'Транспорт, озеленение, социальная сфера, безопасность и сервисы. В каждой нужно выбрать ровно один проект — галочка появится, когда выбор сделан.'],
      ['Карточки проектов', 'На карточке — стоимость в тенге, эффекты по показателям, риски, скорость результата и расходы на обслуживание. Нажмите «Выбрать проект».'],
      ['Бюджет направления', 'Двигайте ползунок: от 5 до 40 ед. Эффект растёт как корень из бюджета, поэтому переплата почти не помогает, а меньше 10 или больше 30 ед. — штраф.'],
      ['Живой прогноз', 'AQLS и диаграмма пересчитываются мгновенно. Здесь же видны синергии — бонусы за удачные пары проектов.'],
      ['Счётчик бюджета', 'Распределите ровно 100 ед. и выберите пять проектов — тогда кнопка «Запустить симуляцию» станет активной.'],
      ['Я всегда рядом', 'Откройте чат: помогу сравнить проекты, предложу бюджетный план и отвечу на свободные вопросы. Предложенные изменения применяются только по вашей кнопке.'],
      ['Настройки', 'Тема оформления, русский, казахский и английский языки, а также повтор обучения — в настройках. Удачи, аким!'],
    ],
    kk: [
      ['Сәлем! Мен QalaBalance AI-көмекшісімін', `Бір минутта қаланы басқаруды көрсетемін. Сізде 100 бюджет бірлігі бар — бұл ${fmtTenge(100, lang)}. Мақсат — өмір сапасын (AQLS) жақсартып, қаржыны теңгерімді бөлу.`],
      ['Қаланың бес саласы', 'Көлік, көгалдандыру, әлеуметтік сала, қауіпсіздік және қалалық қызметтер. Әр салада бір жоба таңдаңыз. Таңдаған соң құсбелгі пайда болады.'],
      ['Жоба карточкалары', 'Карточкада жобаның теңгемен құны, көрсеткіштерге әсері, тәуекелдері, іске асу мерзімі және күтіп ұстау шығындары берілген. «Жобаны таңдау» батырмасын басыңыз.'],
      ['Сала бюджеті', 'Жүгірткіні жылжытып, 5–40 бірлік бөліңіз. Әсер бюджетке қарағанда баяу өседі, сондықтан артық қаржының пайдасы шектеулі. 10-нан аз немесе 30-дан көп бірлік бөлінсе, айып ұпайы есептеледі.'],
      ['Бірден жаңаратын болжам', 'AQLS пен диаграмма әр өзгерістен кейін қайта есептеледі. Үйлесімді жоба жұптарының қосымша әсері де осы жерде көрсетіледі.'],
      ['Бюджет есебі', 'Бес жобаны таңдап, дәл 100 бірлікті бөліңіз. Сонда «Симуляцияны іске қосу» батырмасы белсенді болады.'],
      ['Мен әрдайым осындамын', 'Чатты ашыңыз: жобаларды салыстыруға, бюджет жоспарын құруға көмектесемін және әртүрлі сұрақтарға жауап беремін. Ұсынылған өзгерістерді тек өзіңіз батырмамен қолданасыз.'],
      ['Баптаулар', 'Баптаулардан түс режимін, қазақ, орыс немесе ағылшын тілін таңдап, нұсқаулықты қайта ашуға болады. Іске сәт, әкім!'],
    ],
    en: [
      ['Hi! I’m the QalaBalance AI assistant', `Let me show you how to manage the city. You have 100 budget units, worth ${fmtTenge(100, lang)}. Your goal is to improve quality of life (AQLS) while keeping the budget balanced.`],
      ['Five city sectors', 'Transport, green spaces, social services, safety and city services. Choose exactly one project in each sector. A check mark confirms your selection.'],
      ['Project cards', 'Each card shows the cost in tenge, effects on city indicators, risks, delivery time and maintenance costs. Select “Select project” to add it to your plan.'],
      ['Sector budget', 'Move the slider to allocate 5–40 units. Benefits grow more slowly than spending, so extra funding has diminishing returns. Allocations below 10 or above 30 incur a score penalty.'],
      ['Live forecast', 'AQLS and the chart update immediately. You can also see synergies: extra benefits from compatible project pairs.'],
      ['Budget tracker', 'Choose five projects and allocate exactly 100 units to enable “Run simulation”.'],
      ['Here when you need me', 'Open the chat to compare projects, request a budget plan or ask a general question. Suggested changes take effect only when you choose to apply them.'],
      ['Settings', 'Choose a theme, switch between Kazakh, Russian and English, or replay this guide in Settings. Good luck, mayor!'],
    ],
  }
  return copy[lang].map(([title, text], index) => ({ title, text, target: TARGETS[index] }))
}
