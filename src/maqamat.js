/* git-tarab — maqam and iqa' data. Isomorphic: runs in Node and in the browser. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Tarab = Object.assign(root.Tarab || {}, api);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Scales are given in cents above the tonic (24-EDO approximations of the
  // traditional intervals; real performers inflect quarter tones more freely).
  // `ghammaz` is the scale index of the dominant note where phrases like to rest.
  const MAQAMAT = {
    rast: {
      id: 'rast', name: 'Rast', ar: 'راست', tonic: 'C', tonicHz: 130.81,
      cents: [0, 200, 350, 500, 700, 900, 1050], ghammaz: 4,
      mood: 'pride and foundation',
      blurb: 'The king of the maqamat. Every other maqam is measured against it.',
    },
    bayati: {
      id: 'bayati', name: 'Bayati', ar: 'بياتي', tonic: 'D', tonicHz: 146.83,
      cents: [0, 150, 300, 500, 700, 800, 1000], ghammaz: 3,
      mood: 'earthy joy',
      blurb: 'The most beloved maqam: warm, familiar, the sound of the street and the home.',
    },
    hijaz: {
      id: 'hijaz', name: 'Hijaz', ar: 'حجاز', tonic: 'D', tonicHz: 146.83,
      cents: [0, 100, 400, 500, 700, 800, 1000], ghammaz: 3,
      mood: 'longing and distance',
      blurb: 'Named after the desert of the Hijaz. The augmented second sounds like a long road at night.',
    },
    saba: {
      id: 'saba', name: 'Saba', ar: 'صبا', tonic: 'D', tonicHz: 146.83,
      cents: [0, 150, 300, 400, 700, 800, 1000], ghammaz: 2,
      mood: 'sorrow',
      blurb: 'The maqam of grief. Its fourth note falls short, as if something were never quite fixed.',
    },
    kurd: {
      id: 'kurd', name: 'Kurd', ar: 'كرد', tonic: 'D', tonicHz: 146.83,
      cents: [0, 100, 300, 500, 700, 800, 1000], ghammaz: 3,
      mood: 'introspection',
      blurb: 'Restrained and inward-looking. A maqam that edits itself.',
    },
    nahawand: {
      id: 'nahawand', name: 'Nahawand', ar: 'نهاوند', tonic: 'C', tonicHz: 130.81,
      cents: [0, 200, 300, 500, 700, 800, 1100], ghammaz: 4,
      mood: 'tenderness',
      blurb: 'Romantic and sentimental. The maqam of things made for love, not money.',
    },
    ajam: {
      id: 'ajam', name: 'Ajam', ar: 'عجم', tonic: 'B♭', tonicHz: 116.54,
      cents: [0, 200, 400, 500, 700, 900, 1100], ghammaz: 4,
      mood: 'brightness and triumph',
      blurb: 'Bright and open, close to the Western major scale. Music for things that are going well.',
    },
    sikah: {
      id: 'sikah', name: 'Sikah', ar: 'سيكاه', tonic: 'E½♭', tonicHz: 160.12,
      cents: [0, 150, 350, 550, 700, 850, 1050], ghammaz: 2,
      mood: 'delicacy and devotion',
      blurb: 'Its tonic sits on a quarter tone, so it never fully lands. Delicate, unfinished, full of promise.',
    },
  };

  // Rhythmic cycles over one bar of eight eighth-notes.
  // D = doum (low, centre of the drum), T = tak (high, rim), K = ka (ghost tak).
  const IQAAT = {
    maqsum: { id: 'maqsum', name: 'Maqsum', ar: 'مقسوم', pattern: ['D', 'T', 'K', 'T', 'D', 'K', 'T', 'K'] },
    baladi: { id: 'baladi', name: 'Baladi', ar: 'بلدي', pattern: ['D', 'D', 'K', 'T', 'D', 'K', 'T', 'K'] },
    saidi: { id: 'saidi', name: "Sa'idi", ar: 'صعيدي', pattern: ['D', 'T', 'K', 'D', 'D', 'K', 'T', 'K'] },
    malfuf: { id: 'malfuf', name: 'Malfuf', ar: 'ملفوف', pattern: ['D', 'K', 'K', 'T', 'K', 'K', 'T', 'K'] },
    wahda: { id: 'wahda', name: 'Wahda', ar: 'وحدة', pattern: ['D', null, 'K', null, 'T', null, 'K', null] },
  };

  const INSTRUMENTS = [
    { id: 'oud', name: 'Oud', ar: 'عود', octave: 0 },
    { id: 'qanun', name: 'Qanun', ar: 'قانون', octave: 1 },
    { id: 'ney', name: 'Ney', ar: 'ناي', octave: 1 },
    { id: 'kamanja', name: 'Kamanja', ar: 'كمنجة', octave: 0 },
  ];

  return { MAQAMAT, IQAAT, INSTRUMENTS };
});
