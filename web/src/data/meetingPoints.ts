// Fixed list of vendor-facing meeting points for domestic tours (TourForm). Replaces free-text
// Google Places search: vendors pick one of these pre-vetted, pre-embedded locations instead of
// typing/geocoding an arbitrary address, so every domestic tour's meeting point renders as a
// full embedded map on TourDetailPage instead of relying on a fragile lat/lng geocode.
export interface MeetingPoint {
  name: string;
  embedUrl: string;
}

export const MEETING_POINTS: MeetingPoint[] = [
  {
    name: 'Gənclik Metrosunun çıxışı, Atatürk parkının qarşısı',
    embedUrl: 'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d774.4312524450341!2d49.84955626962236!3d40.40039401951195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zNDDCsDI0JzAxLjQiTiA0OcKwNTEnMDAuNyJF!5e1!3m2!1str!2slv!4v1783229526024!5m2!1str!2slv',
  },
  {
    name: 'Gotabiat - Toplanış yeri',
    embedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3097.716914197266!2d49.84744097592123!3d40.40056995662286!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40307d0008f3743b%3A0x8e152613424aac00!2zR2VkyZlrIEfDtnLJmWsgLSBUb3BsYW7EscWfIHllcmk!5e1!3m2!1str!2slv!4v1783230047257!5m2!1str!2slv',
  },
  {
    name: '20 Yanvar metrosunun çıxışı, Bravo Hipermarketin qarşısı',
    embedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3097.671304506157!2d49.808235875921326!3d40.40156115656251!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40308728d527a219%3A0xd63ef03f7b58ae42!2sBravo!5e1!3m2!1str!2slv!4v1783230079366!5m2!1str!2slv',
  },
  {
    name: 'Nərimanov Metrosunun çıxışı',
    embedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3097.6094501731654!2d49.869020975921465!3d40.402905356480794!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40307d49ea007559%3A0x8abaf4a6c7a844b8!2sN%C9%99rimanov%20metrostansiyas%C4%B1%201!5e1!3m2!1str!2slv!4v1783230156601!5m2!1str!2slv',
  },
];
