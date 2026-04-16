const CURRENT_YEAR = new Date().getFullYear();

export const defaultSettings = {
  lang: 'en',
  year: CURRENT_YEAR,
  isStarter: false,
  workedHours: 0,
  calendarHours: 0,
  lastCalSync: null,
  onboarded: false,
  businessType: '',
  favCats: [],
};

export const defaultProfile = {
  companyName: '',
  address: '',
  postal: '',
  phone: '',
  email: '',
  web: '',
  kvk: '',
  btw: '',
  iban: '',
  logo: '',
  paymentDays: 30,
};
