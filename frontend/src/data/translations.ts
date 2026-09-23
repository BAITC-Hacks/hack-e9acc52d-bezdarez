import type { Category, Metric } from '../types/project'
import type { DistrictId } from './districts'
import { PROJECTS_BY_ID } from './projects'

export type Lang = 'ru' | 'kk' | 'en'

/** Переводы данных каталога. Русский — исходный язык в projects.ts / districts.ts. */
export interface ProjectText {
  title: string
  short: string
  benefits: string[]
  risks: string[]
}

export const PROJECT_TEXT: Record<'kk' | 'en', Record<string, ProjectText>> = {
  kk: {
    'adaptive-traffic-lights': { title: 'Бейімделгіш бағдаршамдар', short: 'Бағдаршамдар фазаларды нақты көлік ағынына бейімдейді.', benefits: ['Негізгі қиылыстарда кептеліс азаяды', 'Қалалық сервистер үшін ағын деректері'], risks: ['Жол желісі толық жүктелсе, әсер шектеулі'] },
    'bus-lanes': { title: 'Автобусқа бөлінген жолақтар', short: 'Автобустар өз жолағымен жүріп, кептелісте тұрмайды.', benefits: ['Қоғамдық көлік жылдам әрі тұрақты', 'Көліктен ауысу есебінен шығарындылар азаяды'], risks: ['Жүргізушілерге уақытша тар болады'] },
    'road-repair': { title: 'Жол инфрақұрылымын жөндеу', short: 'Жабынды, белгілерді және қауіпті учаскелерді жөндеу.', benefits: ['Жылдам әрі көрінетін нәтиже', 'Жол жағдайына байланысты апаттар азаяды'], risks: ['Жөндеу көлік ағыны мен шығарындыларды арттырады', 'Тозу салдарынан әсер уақыт өте әлсірейді'] },
    'lrt-extension': { title: 'ЖРТ желісін ұзарту', short: 'Жеңіл рельсті көліктің жаңа бекеттері тұрғын аудандарға.', benefits: ['Мобильділік үшін ең күшті ұзақ мерзімді әсер', 'Есіл көпірлерінде көлік азаяды'], risks: ['Өте қымбат әрі ұзақ құрылыс', 'Жұмыс кезінде көшелер уақытша жабылады'] },
    'bike-lanes': { title: 'Веложолдар мен ЖЖҚ жолақтары', short: 'Велосипед пен самокатқа арналған байланысқан желі.', benefits: ['Көлікпен жүруге арзан балама', 'Қысқа сапарларда шығарынды аз'], risks: ['Маусымдық: қыста әсері айтарлықтай төмен', 'Белгісіз жерде жаяу жүргіншілермен қақтығыс'] },
    'park-and-ride': { title: 'Ұстап қалу тұрақтары', short: 'Соңғы аялдамалардағы тұрақтар, автобус пен ЖРТ-ға ауысу.', benefits: ['Орталықта көлік азаяды', 'Бос учаскелерде тез салынады'], risks: ['Қоғамдық көлік ыңғайлы болғанда ғана жұмыс істейді'] },
    'smart-irrigation': { title: 'Ақылды суару жүйесі', short: 'Ылғал датчиктері тек қажет жерде және қажет кезде суарады.', benefits: ['Жасыл аймақтар ыстық жазға төтеп береді', 'Су мен коммуналдық қызмет еңбегі үнемделеді'], risks: ['Жаңа жасыл аймақ қоспайды, барын ғана сақтайды'] },
    'tree-planting': { title: 'Ағаш және жасыл белдеу отырғызу', short: 'Жаңа ағаштар мен желден қорғайтын жасыл белдеулер.', benefits: ['Экология үшін күшті ұзақ мерзімді әсер', 'Серуен мен демалыс жайлырақ'], risks: ['Бірінші жылы әсері аз — ағаштар өсуде', 'Жас көшеттерге күтім қажет'] },
    'courtyard-improvement': { title: 'Аулаларды абаттандыру', short: 'Тұрғын үй аулаларында көгал, алаңдар мен орындықтар.', benefits: ['Тұрғындар өзгерісті бірден көреді', 'Балалар мен көршілерге арналған орын көбейеді'], risks: ['Әсері жергілікті — барлық аудандарды қамтымайды'] },
    'esil-embankment': { title: 'Есіл жағалауын абаттандыру', short: 'Өзен бойындағы серуен аймағы, веложол және көгал.', benefits: ['Бүкіл қалаға жаңа қоғамдық кеңістік', 'Жағалаудағы кварталдардың тартымдылығы артады'], risks: ['Тазалау мен күзетке маусымдық жүктеме'] },
    'air-monitoring': { title: 'Ауа сапасы датчиктерінің желісі', short: 'Бүкіл қала бойынша PM2.5 датчиктері және ашық ауа картасы.', benefits: ['Тұрғындарға ауа туралы ашық деректер', 'Түтінге қарсы нақты шаралардың негізі'], risks: ['Датчиктердің өзі ауаны тазартпайды — кейінгі шаралар керек'] },
    'private-sector-gas': { title: 'Жеке секторды газдандыру', short: 'Жеке үйлерді көмірден газға ауыстыру.', benefits: ['Қысқы түтін күрт азаяды', 'Көмір күлі мен өрт азаяды'], risks: ['Желі тарту қымбат', 'Үйлерді қосуға субсидия қажет'] },
    'school-expansion': { title: 'Мектептердегі орынды кеңейту', short: 'Толып кеткен мектептерге жапсаржай мен жаңа сыныптар.', benefits: ['Толып кеткен сыныптар азаяды', 'Бірнеше жылдан кейін күшті әсер'], risks: ['Құрылыс уақыт алады', 'Ғимаратты ұстау шығыны жоғары'] },
    'mobile-clinics': { title: 'Жылжымалы медициналық пункттер', short: 'Шалғай аудандарда көшпелі алғашқы көмек пункттері.', benefits: ['Алғашқы медицинаға қолжетімділік жылдамдайды', 'Емханалардың жүктемесі азаяды'], risks: ['Толыққанды емхананы алмастырмайды'] },
    'accessible-environment': { title: 'Қолжетімді қалалық орта', short: 'Пандустар, тактильді плитка және аласа еденді көлік.', benefits: ['Қала барлық топтарға ыңғайлы болады', 'Қалалық сервистерді көбірек адам пайдаланады'], risks: ['Әсері бірден және бәріне көрінбейді'] },
    kindergartens: { title: 'Жаңа балабақшалар', short: 'Жылдам өсіп жатқан шағын аудандарда балабақшалар.', benefits: ['Балабақша кезегі қысқарады', 'Ата-аналар жұмысқа тезірек оралады'], risks: ['Құрылыс уақыт алады', 'Кадр керек — тәрбиешілер'] },
    'sport-hubs': { title: 'Ауладағы спорт алаңдары', short: 'Футбол, воркаут және таза ауадағы жаттығу алаңдары.', benefits: ['Аулаларда жылдам көрінетін нәтиже', 'Жасөспірімдер уақытын пайдалы өткізеді'], risks: ['Бақылаусыз алаңдар тез тозады'] },
    'senior-centers': { title: 'Белсенді ұзақ өмір орталықтары', short: 'Егде жастағы тұрғындарға арналған демалыс, оқу және денсаулық.', benefits: ['Егде тұрғындар жалғыз қалмайды', 'Алдын алу емханаларға жүктемені азайтады'], risks: ['Әсері тек бір топқа байқалады'] },
    'street-lighting': { title: 'Көшелер мен аулаларды жарықтандыру', short: 'Қараңғы учаскелерге жаңа энергия үнемдейтін шамдар.', benefits: ['Кешке тұрғындар өзін қауіпсіз сезінеді', 'Жылдам және көрінетін нәтиже'], risks: ['Электр энергиясы мен қызмет көрсету шығыны өседі'] },
    'emergency-center': { title: 'Бірыңғай ден қою орталығы', short: 'Барлық шұғыл қызметтер — бір диспетчерлікте.', benefits: ['Оқиғаларда көмек тезірек келеді', 'Қызметтер арасындағы үйлестіру'], risks: ['Персоналды оқыту мен жүйелерді біріктіруге уақыт керек'] },
    'incident-analytics': { title: 'Қалалық оқиғалар аналитикасы', short: 'Деректер қай жерде және қашан тәуекел жоғары екенін көрсетеді.', benefits: ['Ден қоюдың орнына алдын алу', 'Қызметтер деректермен жұмыс істейді'], risks: ['Тұрғындар өзгерісті тікелей байқамайды'] },
    'smart-cameras': { title: 'Қиылыстардағы ақылды камералар', short: 'Камералар ЖҚЕ бұзушылықтары мен қауіпті жағдайларды тіркейді.', benefits: ['Қауіпті қиылыстарда ЖКО азаяды', 'Орнатқаннан кейін жылдам әсер'], risks: ['Жеке өмір мен деректерді сақтау мәселелері'] },
    'safe-crossings': { title: 'Мектеп маңындағы қауіпсіз өткелдер', short: 'Мектеп маңында көтерілген өткелдер, аралшалар және жарық.', benefits: ['Балалар мектепке қауіпсіз жетеді', 'Арзан әрі жылдам'], risks: ['Көлік қозғалысы сәл баяулайды'] },
    'flood-protection': { title: 'Су тасқынынан қорғау', short: 'Бөгеттер, нөсер кәрізі және су деңгейін бақылау.', benefits: ['Көктемде су басу азаяды', 'Ойпаттағы үйлер мен жолдар қорғалады'], risks: ['Әсері тек тасқын маусымында көрінеді', 'Қымбат инженерлік жұмыстар'] },
    'digital-requests': { title: 'Өтініштердің цифрлық платформасы', short: 'Тұрғындардың шағымдары мен өтінімдеріне бір терезе, шешім мәртебесімен.', benefits: ['Өтініштер тез әрі ашық шешіледі', 'Қызмет көрсету шығыны төмен'], risks: ['Қызметтерге ресурс жетпесе, мәселені шешпейді'] },
    'smart-snow-removal': { title: 'Ақылды қар тазалау', short: 'Қар жауу мен көлік ағыны деректері бойынша техника бағыттары.', benefits: ['Қыста қала кептелісте аз тұрады', 'Тротуарлар мен аялдамалар қауіпсізірек'], risks: ['Реагент пен техника шығарындысы көбейеді', 'Техника паркіне тұрақты шығын'] },
    'waste-optimization': { title: 'Қоқыс шығаруды оңтайландыру', short: 'Контейнер толу датчиктері және қоқыс көліктерінің тиімді бағыттары.', benefits: ['Аулалар мен контейнер алаңдары тазарақ', 'Қоқыс көліктерінің жүрісі азаяды'], risks: ['Тасымалдаушылар мен тұрғындардан тәртіп талап етеді'] },
    'heat-network': { title: 'Жылу желілерін жаңғырту', short: 'Тозған құбырлар мен жылу беру тораптарын ауыстыру.', benefits: ['Қыста апат пен ажырату азаяды', 'Желідегі жылу шығыны азаяды'], risks: ['Жазда қазба жұмыстары мен көше жабылуы', 'Өте жоғары құн'] },
    'egov-services': { title: 'Проактивті мемлекеттік қызметтер', short: 'Анықтамалар мен төлемдер өтінішсіз өздігінен келеді.', benefits: ['Кезек пен бару азаяды', 'Арзан әрі жылдам'], risks: ['Цифрлық форматтың бәріне ыңғайлы еместігі'] },
    'public-wifi': { title: 'Көлік пен саябақтарда Wi-Fi', short: 'Автобустарда, аялдамаларда және саябақтарда тегін интернет.', benefits: ['Сервистер барлық тұрғындарға қолжетімді', 'Жылдам және көрінетін әсер'], risks: ['Трафик пен жабдыққа тұрақты шығын'] },
  },
  en: {
    'adaptive-traffic-lights': { title: 'Adaptive traffic lights', short: 'Signal phases adapt to real traffic flow.', benefits: ['Fewer jams at key intersections', 'Traffic data for city services'], risks: ['Limited effect if the whole road network is saturated'] },
    'bus-lanes': { title: 'Dedicated bus lanes', short: 'Buses run in their own lane instead of sitting in traffic.', benefits: ['Faster, more reliable public transport', 'Lower emissions as drivers switch to buses'], risks: ['Temporarily tighter roads for car drivers'] },
    'road-repair': { title: 'Road infrastructure repair', short: 'Repairing pavement, markings and dangerous sections.', benefits: ['Fast, visible result', 'Fewer crashes caused by road conditions'], risks: ['Repairs attract more car traffic and emissions', 'The effect fades as roads wear out'] },
    'lrt-extension': { title: 'LRT line extension', short: 'New light-rail stations in residential districts.', benefits: ['The strongest long-term boost to mobility', 'Fewer cars on the Esil bridges'], risks: ['Very expensive with a long build', 'Temporary street closures during works'] },
    'bike-lanes': { title: 'Bike and scooter lanes', short: 'A connected network of lanes for bikes and e-scooters.', benefits: ['A cheap alternative to short car trips', 'Lower emissions on short journeys'], risks: ['Seasonal: much weaker effect in winter', 'Conflicts with pedestrians without markings'] },
    'park-and-ride': { title: 'Park-and-ride lots', short: 'Parking at terminal stops with transfers to buses and LRT.', benefits: ['Fewer cars downtown', 'Quick to build on vacant plots'], risks: ['Only works if public transport is convenient'] },
    'smart-irrigation': { title: 'Smart irrigation', short: 'Moisture sensors water only where and when needed.', benefits: ['Green areas survive hot summers', 'Saves water and utility labour'], risks: ['Preserves existing green areas rather than adding new ones'] },
    'tree-planting': { title: 'Trees and green belts', short: 'New trees and wind-protection green belts.', benefits: ['Strong long-term effect on ecology', 'More pleasant walks and recreation'], risks: ['Modest effect in year one — trees need time', 'Young trees need care'] },
    'courtyard-improvement': { title: 'Courtyard improvement', short: 'Greenery, playgrounds and benches in residential yards.', benefits: ['Residents see changes right at home', 'More space for kids and neighbours'], risks: ['Local effect — not every district benefits'] },
    'esil-embankment': { title: 'Esil embankment upgrade', short: 'Promenade, bike paths and greenery along the river.', benefits: ['A new public space for the whole city', 'Riverside neighbourhoods become more attractive'], risks: ['Seasonal load on cleaning and security'] },
    'air-monitoring': { title: 'Air-quality sensor network', short: 'PM2.5 sensors across the city and an open air map.', benefits: ['Transparent air data for residents', 'A basis for targeted anti-smog measures'], risks: ['Sensors alone do not clean the air — follow-up measures are needed'] },
    'private-sector-gas': { title: 'Gas for private housing', short: 'Switching private homes from coal to gas.', benefits: ['Sharp drop in winter smog', 'Less coal ash and fewer fires'], risks: ['Expensive pipeline construction', 'Households need connection subsidies'] },
    'school-expansion': { title: 'More school places', short: 'Extensions and new classrooms for overcrowded schools.', benefits: ['Fewer overcrowded classes', 'Strong effect after a few years'], risks: ['Construction takes time', 'High building maintenance costs'] },
    'mobile-clinics': { title: 'Mobile medical units', short: 'Travelling primary-care units in remote districts.', benefits: ['Faster access to primary care', 'Relieves permanent clinics'], risks: ['Not a substitute for full clinics'] },
    'accessible-environment': { title: 'Accessible city', short: 'Ramps, tactile paving and low-floor transport.', benefits: ['The city becomes easier for everyone', 'More people can use city services'], risks: ['The effect is gradual and not visible to all'] },
    kindergartens: { title: 'New kindergartens', short: 'Kindergartens in fast-growing neighbourhoods.', benefits: ['Shorter kindergarten waiting lists', 'Parents return to work sooner'], risks: ['Construction takes time', 'Requires staff — teachers'] },
    'sport-hubs': { title: 'Courtyard sports grounds', short: 'Grounds for football, street workout and outdoor exercise.', benefits: ['Quick visible result in yards', 'Teenagers spend time productively'], risks: ['Unsupervised grounds wear out quickly'] },
    'senior-centers': { title: 'Active ageing centres', short: 'Leisure, learning and health for older residents.', benefits: ['Older residents are less isolated', 'Prevention reduces clinic workload'], risks: ['Benefits only one group of residents'] },
    'street-lighting': { title: 'Street and yard lighting', short: 'New energy-efficient lamps on dark sections.', benefits: ['Residents feel safer in the evening', 'Fast, visible result'], risks: ['Higher electricity and maintenance costs'] },
    'emergency-center': { title: 'Unified emergency centre', short: 'All emergency services in one dispatch room.', benefits: ['Faster help during incidents', 'Services coordinate with each other'], risks: ['Staff training and system integration take time'] },
    'incident-analytics': { title: 'City incident analytics', short: 'Data shows where and when risks are higher.', benefits: ['Prevention instead of reaction', 'Services work from data'], risks: ['Residents barely notice changes directly'] },
    'smart-cameras': { title: 'Smart intersection cameras', short: 'Cameras record traffic violations and dangerous situations.', benefits: ['Fewer crashes at dangerous intersections', 'Fast effect after installation'], risks: ['Privacy and data-retention concerns'] },
    'safe-crossings': { title: 'Safe crossings near schools', short: 'Raised crossings, refuge islands and lighting near schools.', benefits: ['Children get to school more safely', 'Cheap and quick'], risks: ['Slightly slower traffic'] },
    'flood-protection': { title: 'Flood protection', short: 'Dams, storm drains and water-level monitoring.', benefits: ['Fewer spring floods', 'Protects homes and roads in low areas'], risks: ['Effect visible only in flood season', 'Expensive engineering works'] },
    'digital-requests': { title: 'Digital request platform', short: 'One window for residents’ complaints and requests, with status tracking.', benefits: ['Requests resolved faster and more transparently', 'Low maintenance costs'], risks: ['Does not help if services lack resources'] },
    'smart-snow-removal': { title: 'Smart snow removal', short: 'Snowplough routes based on snowfall and traffic data.', benefits: ['Less winter gridlock', 'Safer sidewalks and stops'], risks: ['More de-icing chemicals and machine emissions', 'Ongoing fleet costs'] },
    'waste-optimization': { title: 'Waste collection optimisation', short: 'Bin fill sensors and optimal garbage-truck routes.', benefits: ['Cleaner yards and bin areas', 'Fewer garbage-truck trips'], risks: ['Needs discipline from carriers and residents'] },
    'heat-network': { title: 'Heating network upgrade', short: 'Replacing worn pipes and heating substations.', benefits: ['Fewer winter breakdowns and outages', 'Less heat lost in the network'], risks: ['Summer excavations and street closures', 'Very high cost'] },
    'egov-services': { title: 'Proactive public services', short: 'Certificates and payments arrive without applications.', benefits: ['Fewer queues and visits', 'Cheap and fast'], risks: ['Not everyone is comfortable with digital formats'] },
    'public-wifi': { title: 'Wi-Fi in transport and parks', short: 'Free internet on buses, at stops and in parks.', benefits: ['Services accessible to all residents', 'Fast, visible effect'], risks: ['Ongoing traffic and equipment costs'] },
  },
}

export interface DistrictText {
  name: string
  short: string
  profile: string
  problems: string[]
}

export const DISTRICT_TEXT: Record<'kk' | 'en', Record<DistrictId, DistrictText>> = {
  kk: {
    esil: { name: 'Есіл ауданы', short: 'Есіл', profile: 'Сол жағалау: жаңа іскерлік орталық, тұрғын үйдің жылдам өсуі.', problems: ['Қарбалас уақытта Есіл көпірлеріндегі кептеліс', 'Жаңа шағын аудандарда мектептер толып кеткен', 'Бизнес-орталықтар маңында тұрақ жетіспейді'] },
    almaty: { name: 'Алматы ауданы', short: 'Алматы', profile: 'Оң жағалау: тығыз құрылыс және шетінде жеке сектор.', problems: ['Жылу және су желілерінің тозуы', 'Жеке сектордағы пеш жағудан түтін', 'Тұрғындар өтініштеріне ұзақ жауап'] },
    saryarka: { name: 'Сарыарқа ауданы', short: 'Сарыарқа', profile: 'Тарихи орталық және ескі тұрғын үй қоры.', problems: ['Қараңғы аулалар мен жарықтың жетіспеуі', 'Ескі тұрғын үй қоры мен тар аулалар', 'Тығыз құрылыста жасыл аймақ аз'] },
    baikonur: { name: 'Байқоңыр ауданы', short: 'Байқоңыр', profile: 'Қаланың солтүстігі: өнеркәсіп аймақтары және вокзал.', problems: ['Ауаға өнеркәсіптік жүктеме', 'Толып кеткен контейнер алаңдары', 'Қоғамдық көлікпен орталыққа жету ұзақ'] },
    nura: { name: 'Нұра ауданы', short: 'Нұра', profile: 'Ең жас аудан: жаңа кварталдар мен жеке құрылыс.', problems: ['Үй маңында мектеп пен емхана жетіспейді', 'Топырақ жолдар және аялдама аз', 'Жеке сектордағы жарықсыз көшелер'] },
  },
  en: {
    esil: { name: 'Esil district', short: 'Esil', profile: 'Left bank: new business centre, rapid housing growth.', problems: ['Rush-hour jams on the Esil bridges', 'Overcrowded schools in new neighbourhoods', 'Lack of parking near business centres'] },
    almaty: { name: 'Almaty district', short: 'Almaty', profile: 'Right bank: dense development and private housing on the outskirts.', problems: ['Worn heating and water networks', 'Smog from stove heating in private housing', 'Slow responses to residents’ requests'] },
    saryarka: { name: 'Saryarka district', short: 'Saryarka', profile: 'Historic centre and old housing stock.', problems: ['Dark yards and poor lighting', 'Old housing stock and cramped yards', 'Few green areas in dense blocks'] },
    baikonur: { name: 'Baikonur district', short: 'Baikonur', profile: 'North of the city: industrial zones and the railway station.', problems: ['Industrial air pollution', 'Overflowing bin areas', 'Long public-transport trips to the centre'] },
    nura: { name: 'Nura district', short: 'Nura', profile: 'The youngest district: new blocks and private housing.', problems: ['Not enough schools and clinics nearby', 'Dirt roads and few bus stops', 'Unlit streets in private housing areas'] },
  },
}

export const CITY_PROBLEMS_TEXT: Record<'kk' | 'en', string[]> = {
  kk: ['Қарбалас уақыттағы жол кептелісі', 'Жасыл аймақтардың жетіспеуі', 'Мектептер мен емханаларға жүктеме', 'Кейбір аумақтардың жеткіліксіз жарықтандырылуы', 'Тұрғындар өтініштерін ұзақ өңдеу'],
  en: ['Rush-hour traffic jams', 'Too few green areas', 'Pressure on schools and clinics', 'Poor lighting in some areas', 'Slow handling of residents’ requests'],
}

export const PROFILE_TEXT: Record<'kk' | 'en', Record<string, { title: string; description: string }>> = {
  kk: {
    technocrat: { title: 'Технократ', description: 'Бюджеттің негізгі бөлігі көлік пен қалалық сервистерге бағытталды. Қала тиімдірек болды, бірақ әлеуметтік сала мен көгалдандыруға ресурс аз тиді.' },
    green: { title: 'Жасыл басшы', description: 'Басымдық — көгалдандыру мен экология. Әсері ұзақ мерзімде күштірек байқалады.' },
    social: { title: 'Әлеуметтік бағдарлы басшы', description: 'Басты назар — мектептер, медицина және қолжетімді орта. Тұрғындар көбірек әлеуметтік кепілдік алады.' },
    safety: { title: 'Қауіпсіздік басымдығы', description: 'Бюджеттің ең үлкен үлесі қауіпсіздікке кетті: жарық, ден қою және алдын алу.' },
    services: { title: 'Сервистік реформатор', description: 'Қалалық сервистерге басымдық: өтініштер, тазалау, қоқыс шығару. Қала күнделікті ыңғайлы жұмыс істейді.' },
    balanced: { title: 'Теңгерімді басшы', description: 'Бюджет күрт ауытқусыз бөлінді. Бірде-бір сала назардан тыс қалмады.' },
  },
  en: {
    technocrat: { title: 'Technocrat', description: 'Most of the budget went to transport and city services. The city became more efficient, but social services and greening got less.' },
    green: { title: 'Green manager', description: 'The priority is greening and ecology. The effect will be stronger in the long run.' },
    social: { title: 'Socially oriented manager', description: 'The focus is on schools, healthcare and accessibility. Residents get stronger social support.' },
    safety: { title: 'Safety first', description: 'The largest share of the budget went to safety: lighting, emergency response and prevention.' },
    services: { title: 'Service reformer', description: 'A bet on city services: requests, cleaning and waste collection. The city works more smoothly every day.' },
    balanced: { title: 'Balanced manager', description: 'The budget was spread without sharp imbalances. No area was left behind.' },
  },
}

export const SYNERGY_TEXT: Record<'kk' | 'en', Record<string, string>> = {
  kk: {
    'lights-digital': 'Бейімделгіш бағдаршамдар + Өтініштердің цифрлық платформасы: қалалық сервистерге +2',
    'buslanes-trees': 'Автобус жолақтары + Ағаш отырғызу: экологияға +2',
    'courtyards-lighting': 'Аулаларды абаттандыру + Көше жарығы: қауіпсіздікке +2, әлеуметтік салаға +1',
    'clinics-emergency': 'Жылжымалы медпункттер + Ден қою орталығы: әлеуметтік салаға +2, қауіпсіздікке +1',
    'snow-analytics': 'Ақылды қар тазалау + Оқиғалар аналитикасы: мобильділікке +1, сервистерге +2',
    'irrigation-waste': 'Ақылды суару + Қоқыс шығаруды оңтайландыру: экологияға +2, сервистерге +1',
    'lrt-accessible': 'ЖРТ ұзарту + Қолжетімді орта: әлеуметтік салаға +2, мобильділікке +1',
    'gas-heat': 'Жеке секторды газдандыру + Жылу желілерін жаңғырту: экологияға +2, сервистерге +1',
    'kindergartens-crossings': 'Балабақшалар + Мектеп маңындағы қауіпсіз өткелдер: әлеуметтік салаға +1, қауіпсіздікке +1',
    'cameras-lights': 'Ақылды камералар + Бейімделгіш бағдаршамдар: қауіпсіздікке +2, мобильділікке +1',
  },
  en: {
    'lights-digital': 'Adaptive traffic lights + Digital request platform: +2 city services',
    'buslanes-trees': 'Bus lanes + Tree planting: +2 ecology',
    'courtyards-lighting': 'Courtyard improvement + Street lighting: +2 safety, +1 social',
    'clinics-emergency': 'Mobile medical units + Emergency centre: +2 social, +1 safety',
    'snow-analytics': 'Smart snow removal + Incident analytics: +1 mobility, +2 services',
    'irrigation-waste': 'Smart irrigation + Waste optimisation: +2 ecology, +1 services',
    'lrt-accessible': 'LRT extension + Accessible city: +2 social, +1 mobility',
    'gas-heat': 'Gas for private housing + Heating network upgrade: +2 ecology, +1 services',
    'kindergartens-crossings': 'Kindergartens + Safe school crossings: +1 social, +1 safety',
    'cameras-lights': 'Smart cameras + Adaptive traffic lights: +2 safety, +1 mobility',
  },
}

export const METRIC_LABELS_I18N: Record<Lang, Record<Metric, string>> = {
  ru: { mobility: 'Мобильность', ecology: 'Экология', social: 'Социальный комфорт', safety: 'Безопасность', services: 'Городские сервисы' },
  kk: { mobility: 'Мобильділік', ecology: 'Экология', social: 'Әлеуметтік жайлылық', safety: 'Қауіпсіздік', services: 'Қалалық сервистер' },
  en: { mobility: 'Mobility', ecology: 'Ecology', social: 'Social comfort', safety: 'Safety', services: 'City services' },
}

export const CATEGORY_LABELS_I18N: Record<Lang, Record<Category, string>> = {
  ru: { transport: 'Транспорт', greening: 'Озеленение', social: 'Социальная сфера', safety: 'Безопасность', services: 'Городские сервисы' },
  kk: { transport: 'Көлік', greening: 'Көгалдандыру', social: 'Әлеуметтік сала', safety: 'Қауіпсіздік', services: 'Қалалық сервистер' },
  en: { transport: 'Transport', greening: 'Greening', social: 'Social services', safety: 'Safety', services: 'City services' },
}


export function projectTitle(id: string, lang: Lang): string {
  return lang === 'ru' ? PROJECTS_BY_ID[id]?.title ?? id : PROJECT_TEXT[lang][id]?.title ?? PROJECTS_BY_ID[id]?.title ?? id
}
