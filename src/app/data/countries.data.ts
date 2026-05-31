export interface Country {
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  // Sudamérica
  { name: 'Argentina',            flag: '🇦🇷' },
  { name: 'Bolivia',              flag: '🇧🇴' },
  { name: 'Brasil',               flag: '🇧🇷' },
  { name: 'Chile',                flag: '🇨🇱' },
  { name: 'Colombia',             flag: '🇨🇴' },
  { name: 'Ecuador',              flag: '🇪🇨' },
  { name: 'Paraguay',             flag: '🇵🇾' },
  { name: 'Perú',                 flag: '🇵🇪' },
  { name: 'Uruguay',              flag: '🇺🇾' },
  { name: 'Venezuela',            flag: '🇻🇪' },
  // CONCACAF
  { name: 'Canadá',               flag: '🇨🇦' },
  { name: 'Costa Rica',           flag: '🇨🇷' },
  { name: 'Cuba',                 flag: '🇨🇺' },
  { name: 'El Salvador',          flag: '🇸🇻' },
  { name: 'Estados Unidos',       flag: '🇺🇸' },
  { name: 'Guatemala',            flag: '🇬🇹' },
  { name: 'Honduras',             flag: '🇭🇳' },
  { name: 'Jamaica',              flag: '🇯🇲' },
  { name: 'México',               flag: '🇲🇽' },
  { name: 'Panamá',               flag: '🇵🇦' },
  { name: 'Trinidad y Tobago',    flag: '🇹🇹' },
  // Europa
  { name: 'Albania',              flag: '🇦🇱' },
  { name: 'Alemania',             flag: '🇩🇪' },
  { name: 'Austria',              flag: '🇦🇹' },
  { name: 'Bélgica',              flag: '🇧🇪' },
  { name: 'Bosnia y Herzegovina', flag: '🇧🇦' },
  { name: 'Bulgaria',             flag: '🇧🇬' },
  { name: 'Croacia',              flag: '🇭🇷' },
  { name: 'Dinamarca',            flag: '🇩🇰' },
  { name: 'Escocia',              flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'Eslovenia',            flag: '🇸🇮' },
  { name: 'España',               flag: '🇪🇸' },
  { name: 'Francia',              flag: '🇫🇷' },
  { name: 'Georgia',              flag: '🇬🇪' },
  { name: 'Grecia',               flag: '🇬🇷' },
  { name: 'Hungría',              flag: '🇭🇺' },
  { name: 'Inglaterra',           flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Italia',               flag: '🇮🇹' },
  { name: 'Noruega',              flag: '🇳🇴' },
  { name: 'Países Bajos',         flag: '🇳🇱' },
  { name: 'Polonia',              flag: '🇵🇱' },
  { name: 'Portugal',             flag: '🇵🇹' },
  { name: 'República Checa',      flag: '🇨🇿' },
  { name: 'República Eslovaca',   flag: '🇸🇰' },
  { name: 'Rumanía',              flag: '🇷🇴' },
  { name: 'Serbia',               flag: '🇷🇸' },
  { name: 'Suecia',               flag: '🇸🇪' },
  { name: 'Suiza',                flag: '🇨🇭' },
  { name: 'Turquía',              flag: '🇹🇷' },
  { name: 'Ucrania',              flag: '🇺🇦' },
  // África
  { name: 'Argelia',              flag: '🇩🇿' },
  { name: 'Camerún',              flag: '🇨🇲' },
  { name: 'Costa de Marfil',      flag: '🇨🇮' },
  { name: 'Egipto',               flag: '🇪🇬' },
  { name: 'Ghana',                flag: '🇬🇭' },
  { name: 'Marruecos',            flag: '🇲🇦' },
  { name: 'Nigeria',              flag: '🇳🇬' },
  { name: 'Senegal',              flag: '🇸🇳' },
  { name: 'Sudáfrica',            flag: '🇿🇦' },
  { name: 'Túnez',                flag: '🇹🇳' },
  // Asia
  { name: 'Arabia Saudita',       flag: '🇸🇦' },
  { name: 'Australia',            flag: '🇦🇺' },
  { name: 'China',                flag: '🇨🇳' },
  { name: 'Corea del Sur',        flag: '🇰🇷' },
  { name: 'Emiratos Árabes',      flag: '🇦🇪' },
  { name: 'Indonesia',            flag: '🇮🇩' },
  { name: 'Irak',                 flag: '🇮🇶' },
  { name: 'Irán',                 flag: '🇮🇷' },
  { name: 'Japón',                flag: '🇯🇵' },
  { name: 'Jordania',             flag: '🇯🇴' },
  { name: 'Qatar',                flag: '🇶🇦' },
  { name: 'Uzbekistán',           flag: '🇺🇿' },
];

export function getFlag(countryName: string): string {
  const match = COUNTRIES.find(
    c => c.name.toLowerCase() === countryName?.toLowerCase()
  );
  return match?.flag ?? '🏳';
}

export function searchCountries(query: string, limit = 8): Country[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return COUNTRIES.filter(c => {
    const name = c.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return name.includes(q);
  }).slice(0, limit);
}
