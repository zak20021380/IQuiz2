const CATEGORIES = [
  {
    slug: 'general-knowledge',
    name: 'General Knowledge',
    displayName: 'دانش عمومی',
    description: 'پرسش‌هایی متنوع از دانستنی‌های عمومی و زندگی روزمره.',
    icon: 'fa-earth-americas',
    color: 'blue',
    aliases: ['General', 'Trivia', 'دانش عمومی']
  },
  {
    slug: 'history',
    name: 'History',
    displayName: 'تاریخ',
    description: 'رویدادها و شخصیت‌های اثرگذار تاریخ ایران و جهان.',
    icon: 'fa-landmark',
    color: 'orange',
    aliases: ['Past', 'Historical', 'تاریخ']
  },
  {
    slug: 'science-nature',
    name: 'Science & Nature',
    displayName: 'علوم و طبیعت',
    description: 'زیست‌شناسی، فیزیک، شیمی و شگفتی‌های طبیعت.',
    icon: 'fa-flask',
    color: 'green',
    aliases: ['Science', 'Nature', 'علم']
  },
  {
    slug: 'technology',
    name: 'Technology',
    displayName: 'فناوری و تکنولوژی',
    description: 'دستاوردهای دیجیتال، کامپیوتر و نوآوری‌های نوین.',
    icon: 'fa-microchip',
    color: 'indigo',
    aliases: ['Tech', 'IT', 'فناوری']
  },
  {
    slug: 'art-literature',
    name: 'Art & Literature',
    displayName: 'هنر و ادبیات',
    description: 'کتاب‌ها، نویسندگان، هنرهای تجسمی و نمایش.',
    icon: 'fa-palette',
    color: 'purple',
    aliases: ['Art', 'Literature', 'ادبیات']
  },
  {
    slug: 'sports',
    name: 'Sports',
    displayName: 'ورزش',
    description: 'رشته‌ها، قهرمانان و رویدادهای ورزشی.',
    icon: 'fa-medal',
    color: 'red',
    aliases: ['Sport', 'ورزش']
  },
  {
    slug: 'geography',
    name: 'Geography',
    displayName: 'جغرافیا',
    description: 'کشورها، شهرها و ویژگی‌های جغرافیایی و فرهنگی.',
    icon: 'fa-globe',
    color: 'teal',
    aliases: ['World', 'Maps', 'جغرافیا']
  },
  {
    slug: 'mythology',
    name: 'Mythology',
    displayName: 'اسطوره‌شناسی',
    description: 'اسطوره‌ها، حماسه‌ها و داستان‌های ماندگار.',
    icon: 'fa-hat-wizard',
    color: 'pink',
    aliases: ['Myths', 'Legend', 'افسانه']
  },
  {
    slug: 'movies-tv',
    name: 'Movies & TV',
    displayName: 'سینما و تلویزیون',
    description: 'فیلم‌ها، سریال‌ها، کارگردانان و بازیگران.',
    icon: 'fa-clapperboard',
    color: 'yellow',
    aliases: ['Film', 'TV', 'سینما']
  },
  {
    slug: 'music',
    name: 'Music',
    displayName: 'موسیقی',
    description: 'سبک‌ها، هنرمندان و سازهای موسیقی.',
    icon: 'fa-music',
    color: 'purple',
    aliases: ['Songs', 'آهنگ', 'نغمه']
  },
  {
    slug: 'business-economy',
    name: 'Business & Economy',
    displayName: 'کسب‌وکار و اقتصاد',
    description: 'مفاهیم اقتصادی، شرکت‌ها و کارآفرینی.',
    icon: 'fa-chart-line',
    color: 'yellow',
    aliases: ['Economy', 'Finance', 'اقتصاد']
  },
  {
    slug: 'language-literacy',
    name: 'Language & Literacy',
    displayName: 'زبان و ادبیات',
    description: 'دستور زبان، واژگان و ریشه‌شناسی واژه‌ها.',
    icon: 'fa-language',
    color: 'teal',
    aliases: ['Language', 'Vocabulary', 'زبان']
  }
];

module.exports = { CATEGORIES };
