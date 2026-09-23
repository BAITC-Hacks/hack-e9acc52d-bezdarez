import type { CityProject } from '../../types/project'

export type ProjectCopy = Pick<CityProject, 'title' | 'shortDescription' | 'fullDescription' | 'benefits' | 'risks' | 'tags'>

const copy = (title: string, shortDescription: string, fullDescription: string, benefits: string[], risks: string[], tags: string[]): ProjectCopy =>
  ({ title, shortDescription, fullDescription, benefits, risks, tags })

export const PROJECT_COPY: Record<'kk' | 'en', Record<string, ProjectCopy>> = {
  kk: {
    'adaptive-traffic-lights': copy(
      'Бейімделетін бағдаршамдар',
      'Бағдаршамдар көлік ағынына қарай жұмыс тәртібін өзгертеді.',
      'Қиылыстардағы датчиктер мен орталық басқару жүйесі жолдардың жүктемесіне қарай жасыл шамның жану уақытын реттейді.',
      ['Негізгі қиылыстардағы кептеліс азаяды', 'Қалалық қызметтер көлік ағыны туралы деректер алады'],
      ['Жол желісі түгел шамадан тыс жүктелсе, нәтиже шектеулі болады'], ['технологиялар', 'жолдар']),
    'bus-lanes': copy(
      'Автобустарға арналған жолақтар',
      'Автобустар бөлек жолақпен жүріп, кептелісте тұрмайды.',
      'Негізгі жолдарда арнайы жолақ бөлу қоғамдық көліктің жылдамдығы мен тұрақтылығын арттырып, тұрғындарды жеке көліктен автобусқа ауысуға ынталандырады.',
      ['Қоғамдық көлік жылдам әрі кестеге сай жүреді', 'Жеке көлікті пайдалану азайып, шығарындылар төмендейді'],
      ['Жеке көлікке арналған жол уақытша тарылады'], ['қоғамдық көлік', 'экология']),
    'road-repair': copy(
      'Жол инфрақұрылымын жөндеу',
      'Жол жабынын, таңбаларын және қауіпті учаскелерді жөндеу.',
      'Жолдарды күрделі және шұңқырлық жөндеу, апат қаупі жоғары учаскелердегі таңбалар мен қоршауларды жаңарту.',
      ['Нәтиже тез байқалады', 'Жолдың нашар күйінен болатын апаттар азаяды'],
      ['Жөнделген жолдар көлік қозғалысы мен шығарындыларды арттыруы мүмкін', 'Жол тозған сайын нәтиже төмендейді'], ['жолдар', 'жылдам нәтиже']),
    'smart-irrigation': copy(
      'Ақылды суару жүйесі',
      'Ылғал датчиктері суаруды тек қажет жерде және қажет уақытта қосады.',
      'Саябақтар мен көгалдарды датчик деректеріне сүйеніп автоматты суару су шығынын және өсімдіктердің қурауын азайтады.',
      ['Жасыл желек жаздың ыстығына төтеп береді', 'Су мен коммуналдық қызметтердің еңбегі үнемделеді'],
      ['Жаңа жасыл аймақ қоспайды, барын ғана сақтайды'], ['экология', 'технологиялар']),
    'tree-planting': copy(
      'Ағаш отырғызу және жасыл белдеулер',
      'Жаңа ағаштар мен желден қорғайтын жасыл белдеулер.',
      'Негізгі жолдар мен аудандардың айналасына ағаш отырғызу көлеңке береді, жел мен шаңнан қорғайды және ауа сапасын жақсартады.',
      ['Экологияға ұзақ мерзімді әсері жоғары', 'Серуендеу мен демалыс жайлы болады'],
      ['Ағаштар өскенше, алғашқы жылы нәтиже аз байқалады', 'Жас көшеттерге күтім қажет'], ['экология', 'ұзақ мерзімді нәтиже']),
    'courtyard-improvement': copy(
      'Аулаларды абаттандыру',
      'Тұрғын үйлердің аулаларына жасыл желек, алаңдар мен орындықтар орнату.',
      'Аулаларды кешенді абаттандыру: көгалдандыру, балалар мен спорт алаңдарын, жаяу жүргінші жолдарын жасау.',
      ['Тұрғындар үй маңындағы өзгерісті бірден көреді', 'Балаларға және көршілердің араласуына орын көбейеді'],
      ['Нәтиже жергілікті аумақпен шектеледі, барлық ауданды қамтымайды'], ['аулалар', 'жайлылық']),
    'school-expansion': copy(
      'Мектептердегі орын санын көбейту',
      'Оқушысы көп мектептерге қосымша ғимараттар мен сыныптар салу.',
      'Қосымша және модульдік ғимараттар салу мектептердің жүктемесін азайтып, үшінші ауысымнан бас тартуға мүмкіндік береді.',
      ['Сыныптардағы оқушы тығыздығы азаяды', 'Бірнеше жылдан кейін елеулі нәтиже береді'],
      ['Құрылысқа уақыт қажет', 'Ғимараттарды күтіп ұстау шығыны жоғары'], ['білім', 'ұзақ мерзімді нәтиже']),
    'mobile-clinics': copy(
      'Көшпелі медициналық пункттер',
      'Шалғай аудандарға барып, алғашқы медициналық көмек көрсету.',
      'Жабдықталған медициналық модульдер емхана жетіспейтін аудандарда кесте бойынша жұмыс істейді.',
      ['Алғашқы медициналық көмекке қол жеткізу жеңілдейді', 'Тұрақты емханалардың жүктемесі азаяды'],
      ['Толыққанды емханалардың орнын баса алмайды'], ['денсаулық', 'жылдам нәтиже']),
    'accessible-environment': copy(
      'Кедергісіз қалалық орта',
      'Пандустар, тактильді тақталар және едені төмен қоғамдық көлік.',
      'Көшелерді, аялдамалар мен қоғамдық ғимараттарды мүгедектігі бар адамдарға, қарттарға және бала арбасымен жүретін ата-аналарға бейімдеу.',
      ['Қала барлық тұрғынға ыңғайлы бола түседі', 'Қалалық қызметтерді пайдаланатын адамдар көбейеді'],
      ['Нәтиже бірден және барлық тұрғынға бірдей байқалмайды'], ['инклюзия', 'жайлылық']),
    'street-lighting': copy(
      'Көшелер мен аулаларды жарықтандыру',
      'Қараңғы учаскелерге энергия үнемдейтін шамдар орнату.',
      'Жарығы жеткіліксіз көшелерге, аулалар мен жаяу жүргінші өткелдеріне жарықдиодты шамдар орнату.',
      ['Кешкі уақытта тұрғындар өздерін қауіпсіз сезінеді', 'Нәтиже тез әрі анық байқалады'],
      ['Электр қуаты мен қызмет көрсету шығындары өседі'], ['қауіпсіздік', 'жылдам нәтиже']),
    'emergency-center': copy(
      'Бірыңғай жедел әрекет ету орталығы',
      'Барлық шұғыл қызмет бір диспетчерлік орталыққа бірігеді.',
      'Диспетчерлік қызметтерді бір орталыққа біріктіру оқиғаларға әрекет ету уақытын қысқартады.',
      ['Оқиға кезінде көмек тезірек келеді', 'Қызметтердің өзара жұмысы үйлеседі'],
      ['Қызметкерлерді оқытуға және жүйелерді біріктіруге уақыт қажет'], ['қауіпсіздік', 'үйлестіру']),
    'incident-analytics': copy(
      'Қалалық оқиғаларды талдау',
      'Деректер қауіптің қай жерде және қашан жоғары екенін көрсетеді.',
      'Өтініштер мен оқиғаларды талдау патрульдер мен жөндеу бригадаларын қажет жерге алдын ала жіберуге көмектеседі.',
      ['Оқиғалардың салдарын жоюдан гөрі алдын алуға басымдық беріледі', 'Қызметтер деректерге сүйеніп жұмыс істейді'],
      ['Тұрғындар өзгерісті тікелей байқамауы мүмкін'], ['деректер', 'технологиялар']),
    'digital-requests': copy(
      'Өтініштерге арналған цифрлық платформа',
      'Тұрғындардың шағымдары мен өтінімдерін қабылдап, орындалу барысын көрсететін бірыңғай терезе.',
      'Бірыңғай платформа өтініштерді қабылдайды, тиісті қызметке жібереді және тұрғынға орындалу күйін көрсетеді.',
      ['Өтініштер жылдам әрі ашық қаралады', 'Қызмет көрсету шығыны төмен'],
      ['Қызметтерде ресурс жеткіліксіз болса, платформа мәселені өздігінен шешпейді'], ['цифрландыру', 'жылдам нәтиже']),
    'smart-snow-removal': copy(
      'Қарды ақылды тазалау',
      'Қар тазалайтын техниканың бағыты қар жаууы мен жол қозғалысына қарай құрылады.',
      'Техниканы GPS арқылы бақылау және қар жауғанда негізгі жолдарға, аялдамалар мен жаяу жүргінші бағыттарына басымдық беру.',
      ['Қыста жол кептелісі азаяды', 'Тротуарлар мен аялдамалар қауіпсіз болады'],
      ['Реагенттерді қолдану мен техника шығарындылары артады', 'Техника паркін ұстауға тұрақты шығын қажет'], ['қыс', 'жылдам нәтиже']),
    'waste-optimization': copy(
      'Қалдықтарды шығаруды оңтайландыру',
      'Контейнерлердің толуын бақылайтын датчиктер және қоқыс таситын көліктің тиімді бағыттары.',
      'Контейнерлердің нақты толуына қарай қоқыс шығару және қалдықтарды бөлек жинау алаңдардың толып кетуін әрі техниканың артық жүрісін азайтады.',
      ['Аулалар мен контейнер алаңдары таза болады', 'Қоқыс таситын көліктердің жүрісі қысқарады'],
      ['Тасымалдаушылар мен тұрғындардың тәртібін талап етеді'], ['экология', 'қалалық қызметтер']),
    'lrt-extension': copy(
      'Жеңіл рельсті көлік желісін ұзарту',
      'Тұрғын аудандарға жеңіл рельсті көліктің жаңа станцияларын салу.',
      'Жеңіл рельсті көлік желісін ұзарту шалғай аудандарды орталықпен байланыстырып, негізгі жолдардағы жеке көлік санын азайтады.',
      ['Қозғалыс қолайлылығына ұзақ мерзімді әсері ең жоғары', 'Есіл үстіндегі көпірлерде көлік азаяды'],
      ['Құны өте жоғары, құрылысы ұзақ жоба', 'Жұмыс кезінде көшелер уақытша жабылады'], ['қоғамдық көлік', 'ұзақ мерзімді нәтиже']),
    'bike-lanes': copy(
      'Велосипед пен самокат жолақтары',
      'Өзара жалғасқан велосипед жолдары мен самокат жолақтары.',
      'Велосипедке және жеке мобильдік құралдарға арналған жолақтар тұрғын аудандарды, саябақтар мен аялдамаларды байланыстырады.',
      ['Автокөлікпен жүрудің қолжетімді баламасы', 'Қысқа сапарлардағы шығарындылар азаяды'],
      ['Маусымға тәуелді: қыста әсері әлдеқайда төмен', 'Жол таңбалары болмаса, жаяу жүргіншілермен қақтығыс болуы мүмкін'], ['экология', 'арзан']),
    'park-and-ride': copy(
      'Қоғамдық көлікке ауысу тұрақтары',
      'Автобус пен жеңіл рельсті көлікке ауысуға арналған шеткі станциялар жанындағы тұрақтар.',
      'Қала маңындағы тұрғындар автокөлігін қала кіреберісінде қалдырып, қоғамдық көлікке ауысады.',
      ['Қала орталығында көлік азаяды', 'Бос учаскелерде тез салынады'],
      ['Қоғамдық көлік ыңғайлы болғанда ғана тиімді'], ['көлік', 'жылдам нәтиже']),
    'esil-embankment': copy(
      'Есіл жағалауын абаттандыру',
      'Өзен бойындағы серуен аймағы, велосипед жолдары және жасыл желек.',
      'Жағалауды кешенді абаттандыру: көгалдандыру, жарықтандыру, демалыс орындарын жасау және жағаларды бекіту.',
      ['Бүкіл қалаға арналған жаңа қоғамдық кеңістік', 'Жағалау маңындағы кварталдардың тартымдылығы артады'],
      ['Маусым кезінде тазалау мен күзетке жүктеме артады'], ['экология', 'қоғамдық кеңістіктер']),
    'air-monitoring': copy(
      'Ауа сапасын бақылайтын датчиктер желісі',
      'Қала бойынша PM2.5 датчиктері және баршаға ашық ауа сапасы картасы.',
      'Датчиктер желісі ластануды нақты уақытта көрсетіп, түтін тұманының көздерін анықтауға көмектеседі.',
      ['Тұрғындар ауа сапасы туралы ашық деректер алады', 'Түтін тұманына қарсы нысаналы шараларға негіз болады'],
      ['Датчиктер ауаны өздігінен тазартпайды, қосымша шаралар қажет'], ['деректер', 'экология']),
    'private-sector-gas': copy(
      'Жеке үйлерді газдандыру',
      'Жеке үйлерді көмірден газға көшіру.',
      'Жеке үйлерді газға қосу қысқы түтін тұманының негізгі көзі саналатын пешпен жылытудың шығарындыларын азайтады.',
      ['Қысқы түтін тұманы едәуір азаяды', 'Көмір күлі мен өрттер азаяды'],
      ['Газ желілерін тарту қымбат', 'Үйлерді қосуға субсидия қажет'], ['экология', 'жылыту']),
    'kindergartens': copy(
      'Жаңа балабақшалар',
      'Халқы тез өсіп жатқан шағын аудандарда балабақша салу.',
      'Балабақшалар салу кезекті қысқартып, ата-аналардың жұмысқа ертерек оралуына мүмкіндік береді.',
      ['Балабақша кезегі қысқарады', 'Ата-аналар жұмысқа тезірек оралады'],
      ['Құрылысқа уақыт қажет', 'Тәрбиешілер қажет'], ['білім', 'отбасылар']),
    'sport-hubs': copy(
      'Ауладағы спорт алаңдары',
      'Футболға, воркаутқа және таза ауада жаттығуға арналған алаңдар.',
      'Аулалардағы заманауи спорт алаңдары барлық жастағы тұрғынға қолжетімді және жыл бойы жұмыс істейді.',
      ['Аулаларда тез байқалатын нәтиже', 'Жасөспірімдер уақытын пайдалы өткізеді'],
      ['Күтім болмаса, алаңдар тез тозады'], ['спорт', 'аулалар']),
    'senior-centers': copy(
      'Белсенді ұзақ өмір сүру орталықтары',
      'Егде жастағы тұрғындарға арналған демалыс, оқу және денсаулық бағдарламалары.',
      'Егде жастағы адамдарға арналған үйірмелер, спорт және медициналық кеңес беретін орталықтар.',
      ['Егде тұрғындардың жалғыздығы азаяды', 'Алдын алу шаралары емханалардың жүктемесін төмендетеді'],
      ['Нәтиже тұрғындардың бір тобына ғана тікелей әсер етеді'], ['әлеуметтік қолдау']),
    'smart-cameras': copy(
      'Қиылыстардағы ақылды камералар',
      'Камералар жол ережесін бұзу мен қауіпті жағдайларды тіркейді.',
      'Апат жиі болатын қиылыстардағы бейнетіркеу жүйесі жүргізушілердің тәртібін жақсартып, қызметтердің әрекетін жеделдетеді.',
      ['Қауіпті қиылыстарда жол апаттары азаяды', 'Орнатқаннан кейін нәтиже тез байқалады'],
      ['Жеке өмірді қорғау және деректерді сақтау мәселелері бар'], ['қауіпсіздік', 'технологиялар']),
    'safe-crossings': copy(
      'Мектеп маңындағы қауіпсіз өткелдер',
      'Мектеп маңында көтеріңкі өткелдер, қауіпсіздік аралшықтары мен жарық орнату.',
      'Мектептер мен балабақшалар жанындағы өткелдерді қайта құру көлік жылдамдығын және адам қағу қаупін азайтады.',
      ['Балалардың мектепке баратын жолы қауіпсіз болады', 'Құны төмен және тез іске асады'],
      ['Көлік қозғалысы сәл баяулайды'], ['қауіпсіздік', 'балалар']),
    'flood-protection': copy(
      'Су тасқынынан қорғау',
      'Бөгеттер, нөсер кәрізі және су деңгейін бақылау.',
      'Жағаларды бекіту, нөсер кәрізін кеңейту және су деңгейінің датчиктері көктемгі су басу қаупін азайтады.',
      ['Көктемгі су басу азаяды', 'Ойпаң жерлердегі үйлер мен жолдар қорғалады'],
      ['Нәтиже су тасқыны маусымында ғана байқалады', 'Инженерлік жұмыстар қымбат'], ['қауіпсіздік', 'инфрақұрылым']),
    'heat-network': copy(
      'Жылу желілерін жаңғырту',
      'Тозған құбырлар мен жылумен жабдықтау тораптарын ауыстыру.',
      'Жылу желілерінің апатты учаскелерін ауыстыру қыста жылудың өшуін және жылу жоғалуын азайтады.',
      ['Қыста апаттар мен жылудың өшуі азаяды', 'Желілердегі жылу жоғалуы төмендейді'],
      ['Жазда жер қазылып, көшелер жабылады', 'Құны өте жоғары'], ['тұрғын үй-коммуналдық шаруашылық', 'ұзақ мерзімді нәтиже']),
    'egov-services': copy(
      'Проактивті мемлекеттік қызметтер',
      'Анықтамалар мен төлемдер өтінішсіз рәсімделеді.',
      'Қалалық қызметтер деректер негізінде алдын ала ұсынылады: тұрғынға халыққа қызмет көрсету орталығына барудың орнына хабарлама келеді.',
      ['Кезек пен мекемеге бару саны азаяды', 'Құны төмен және тез іске асады'],
      ['Цифрлық формат барлық тұрғынға бірдей ыңғайлы емес'], ['цифрландыру', 'жылдам нәтиже']),
    'public-wifi': copy(
      'Көлік пен саябақтардағы Wi-Fi',
      'Автобустарда, аялдамаларда және саябақтарда тегін интернет.',
      'Қоғамдық орындардағы қалалық Wi-Fi желісі цифрлық қызметтерді баршаға қолжетімді етеді.',
      ['Қызметтер барлық тұрғынға қолжетімді бола түседі', 'Нәтиже тез әрі анық байқалады'],
      ['Интернет трафигі мен жабдыққа тұрақты шығын қажет'], ['цифрландыру']),
  },
  en: {
    'adaptive-traffic-lights': copy(
      'Adaptive traffic lights', 'Traffic lights adjust their timing to actual traffic flows.',
      'Sensors at junctions and a central control system allocate green-light time according to traffic demand.',
      ['Less congestion at key junctions', 'Traffic data for city services'],
      ['Benefits are limited if the entire road network is overloaded'], ['technology', 'roads']),
    'bus-lanes': copy(
      'Dedicated bus lanes', 'Buses use their own lanes instead of waiting in traffic.',
      'Dedicated lanes on major roads make public transport faster and more reliable, encouraging drivers to switch to buses.',
      ['Faster, more reliable public transport', 'Lower emissions as people switch from cars'],
      ['Less road space for drivers during the transition'], ['public transport', 'environment']),
    'road-repair': copy(
      'Road infrastructure repairs', 'Repair road surfaces, markings and hazardous sections.',
      'Major repairs and pothole filling, with renewed markings and barriers at accident-prone locations.',
      ['Quick, visible results', 'Fewer crashes caused by poor road conditions'],
      ['Better roads can encourage more car traffic and emissions', 'Benefits decline as surfaces wear out'], ['roads', 'quick results']),
    'smart-irrigation': copy(
      'Smart irrigation system', 'Moisture sensors activate watering only where and when it is needed.',
      'Automatic, sensor-controlled watering of parks and lawns reduces water use and plant loss.',
      ['Green spaces survive hot summers', 'Lower water use and less work for municipal teams'],
      ['Preserves existing green spaces without creating new ones'], ['environment', 'technology']),
    'tree-planting': copy(
      'Tree planting and green belts', 'New trees and green belts that provide shelter from the wind.',
      'Trees along major roads and district boundaries provide shade, reduce wind and dust, and improve air quality.',
      ['Strong long-term environmental benefits', 'More comfortable places to walk and relax'],
      ['Limited benefits in the first year while trees grow', 'Young trees need ongoing care'], ['environment', 'long-term benefits']),
    'courtyard-improvement': copy(
      'Residential courtyard improvements', 'Greenery, play areas and benches around residential buildings.',
      'Comprehensive courtyard improvements with planting, playgrounds, sports areas and footpaths.',
      ['Residents see changes close to home', 'More places for children and neighbours to spend time together'],
      ['Local benefits do not reach every district'], ['courtyards', 'comfort']),
    'school-expansion': copy(
      'More school places', 'Extensions and new classrooms for overcrowded schools.',
      'Extensions and modular buildings reduce school overcrowding and help eliminate third-shift classes.',
      ['Less crowded classrooms', 'Strong benefits over several years'],
      ['Construction takes time', 'High building maintenance costs'], ['education', 'long-term benefits']),
    'mobile-clinics': copy(
      'Mobile medical clinics', 'Visiting primary-care clinics for outlying districts.',
      'Equipped mobile units follow a regular schedule in districts with too few permanent clinics.',
      ['Faster access to primary healthcare', 'Less pressure on permanent clinics'],
      ['Cannot replace fully equipped permanent clinics'], ['health', 'quick results']),
    'accessible-environment': copy(
      'Accessible urban environment', 'Ramps, tactile paving and low-floor public transport.',
      'Adapt streets, stops and public buildings for people with disabilities, older residents and parents with pushchairs.',
      ['A more accessible city for all residents', 'More people can use city services'],
      ['Benefits are not immediately visible to everyone'], ['inclusion', 'comfort']),
    'street-lighting': copy(
      'Street and courtyard lighting', 'New energy-efficient lights in poorly lit areas.',
      'Install LED lighting on streets, in courtyards and at pedestrian crossings that lack sufficient light.',
      ['Residents feel safer in the evening', 'Quick, visible results'],
      ['Higher electricity and maintenance costs'], ['safety', 'quick results']),
    'emergency-center': copy(
      'Integrated emergency response centre', 'All emergency services share one dispatch centre.',
      'Combining dispatch services in one centre reduces the time needed to respond to incidents.',
      ['Faster help in emergencies', 'Better coordination between services'],
      ['Staff training and system integration take time'], ['safety', 'coordination']),
    'incident-analytics': copy(
      'City incident analytics', 'Data reveals where and when risks are higher.',
      'Analysing reports and incidents helps direct patrols and repair teams to places where they will be needed.',
      ['More prevention instead of reacting after incidents', 'Services make decisions based on data'],
      ['Residents may not see the changes directly'], ['data', 'technology']),
    'digital-requests': copy(
      'Digital resident request platform', 'One place to submit complaints and requests and track their progress.',
      'A shared platform receives requests, routes them to the appropriate service and shows residents their status.',
      ['Faster and more transparent handling of requests', 'Low maintenance costs'],
      ['Cannot resolve issues if services lack resources'], ['digital services', 'quick results']),
    'smart-snow-removal': copy(
      'Smart snow clearance', 'Snow-clearing routes based on snowfall and traffic data.',
      'GPS tracking of vehicles and prioritisation of main roads, stops and walking routes during snowfall.',
      ['Less congestion in winter', 'Safer pavements and bus stops'],
      ['More de-icing chemicals and vehicle emissions', 'Ongoing costs of maintaining the vehicle fleet'], ['winter', 'quick results']),
    'waste-optimization': copy(
      'Optimised waste collection', 'Bin fill-level sensors and efficient collection routes.',
      'Collection based on actual container fill levels and separate waste collection reduce overflowing bins and unnecessary vehicle travel.',
      ['Cleaner courtyards and bin areas', 'Fewer kilometres driven by collection vehicles'],
      ['Requires cooperation from operators and residents'], ['environment', 'city services']),
    'lrt-extension': copy(
      'Light rail extension', 'New light rail stations serving residential districts.',
      'Extending the light rail line connects outlying districts to the centre and reduces car traffic on major roads.',
      ['The strongest long-term mobility benefits', 'Fewer cars on bridges across the Esil'],
      ['Very expensive project with a long construction period', 'Temporary street closures during construction'], ['public transport', 'long-term benefits']),
    'bike-lanes': copy(
      'Cycle lanes and scooter routes', 'A connected network of cycle paths and scooter lanes.',
      'Dedicated routes for bicycles and personal mobility devices connect residential areas, parks and public transport stops.',
      ['An affordable alternative to car journeys', 'Lower emissions from short trips'],
      ['Seasonal benefits are much lower in winter', 'Conflicts with pedestrians if routes lack clear markings'], ['environment', 'low cost']),
    'park-and-ride': copy(
      'Park-and-ride facilities', 'Car parks at terminal stations with bus and light rail connections.',
      'Residents from the suburbs leave their cars at the edge of the city and continue by public transport.',
      ['Fewer cars in the centre', 'Quick to build on available land'],
      ['Effective only with convenient public transport connections'], ['transport', 'quick results']),
    'esil-embankment': copy(
      'Esil embankment improvements', 'Riverside walking areas, cycle paths and greenery.',
      'Comprehensive embankment improvements with planting, lighting, places to relax and reinforced riverbanks.',
      ['A new public space for the whole city', 'More attractive riverside neighbourhoods'],
      ['Seasonal pressure on cleaning and security services'], ['environment', 'public spaces']),
    'air-monitoring': copy(
      'Air quality sensor network', 'Citywide PM2.5 sensors and a public air quality map.',
      'A sensor network reports pollution in real time and helps identify sources of smog.',
      ['Open air quality data for residents', 'Evidence for targeted action against smog'],
      ['Sensors do not clean the air; follow-up action is needed'], ['data', 'environment']),
    'private-sector-gas': copy(
      'Gas connections for private homes', 'Switch private homes from coal heating to gas.',
      'Connecting private homes to gas reduces emissions from stoves, a major source of winter smog.',
      ['A substantial reduction in winter smog', 'Less coal ash and fewer fires'],
      ['Expensive network construction', 'Household connections require subsidies'], ['environment', 'heating']),
    'kindergartens': copy(
      'New kindergartens', 'Kindergartens in rapidly growing neighbourhoods.',
      'Building kindergartens reduces waiting lists and helps parents return to work sooner.',
      ['Shorter kindergarten waiting lists', 'Parents can return to work sooner'],
      ['Construction takes time', 'Qualified early-years staff are needed'], ['education', 'families']),
    'sport-hubs': copy(
      'Neighbourhood sports areas', 'Spaces for football, calisthenics and outdoor exercise.',
      'Modern sports areas in residential courtyards are open to all ages throughout the year.',
      ['Quick, visible improvements near homes', 'Productive activities for teenagers'],
      ['Facilities wear out quickly without proper care'], ['sport', 'courtyards']),
    'senior-centers': copy(
      'Active ageing centres', 'Leisure, learning and health support for older residents.',
      'Centres offering clubs, exercise and medical consultations for older people.',
      ['Less isolation among older residents', 'Preventive care reduces pressure on clinics'],
      ['Direct benefits focus on one group of residents'], ['social support']),
    'smart-cameras': copy(
      'Smart cameras at junctions', 'Cameras record traffic violations and dangerous situations.',
      'Video monitoring at accident-prone junctions encourages safer driving and helps services respond faster.',
      ['Fewer crashes at dangerous junctions', 'Quick benefits after installation'],
      ['Privacy and data storage concerns'], ['safety', 'technology']),
    'safe-crossings': copy(
      'Safe crossings near schools', 'Raised crossings, refuge islands and lighting near schools.',
      'Redesigning crossings near schools and kindergartens reduces vehicle speeds and the risk of pedestrian collisions.',
      ['Safer routes to school for children', 'Low cost and quick to implement'],
      ['A slight reduction in traffic speed'], ['safety', 'children']),
    'flood-protection': copy(
      'Flood protection', 'Flood barriers, storm drains and water-level monitoring.',
      'Reinforcing riverbanks, expanding storm drains and installing water-level sensors reduce spring flood risks.',
      ['Less flooding in spring', 'Protection for homes and roads in low-lying areas'],
      ['Benefits become visible during flood season', 'Expensive engineering work'], ['safety', 'infrastructure']),
    'heat-network': copy(
      'Heating network modernisation', 'Replace worn pipes and district heating equipment.',
      'Replacing failure-prone sections of the heating network reduces winter heating outages and heat loss.',
      ['Fewer breakdowns and outages in winter', 'Less heat lost in the network'],
      ['Excavations and street closures in summer', 'Very high cost'], ['utilities', 'long-term benefits']),
    'egov-services': copy(
      'Proactive public services', 'Documents and benefits are arranged without an application.',
      'City services use available data to act proactively: residents receive a notification instead of visiting a public service centre.',
      ['Fewer queues and in-person visits', 'Low cost and quick to implement'],
      ['Digital services are not convenient for every resident'], ['digital services', 'quick results']),
    'public-wifi': copy(
      'Wi-Fi on public transport and in parks', 'Free internet on buses, at stops and in parks.',
      'A municipal Wi-Fi network in public places makes digital services more accessible to everyone.',
      ['Easier access to services for all residents', 'Quick, visible benefits'],
      ['Ongoing costs for connectivity and equipment'], ['digital services']),
  },
}
