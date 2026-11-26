// Sky Letters (3D) — the five letters: objectives, dialogue and letter text.
// Each mission has a different goal so every flight feels different:
// rings, a timed delivery, a low canyon run, fuel management at dusk,
// and a sunset landing at the memorial hill.
export const MISSIONS = [
  {
    id: 1, name: 'For Grandma Sari', kind: 'rings', timeLimit: 0, wind: 0,
    sky: 'day', brief: 'Grandma Sari has waited three years for news of her grandson. Fly through 3 golden rings, then land gently on the water runway at Pulau Senja.',
    lines: [
      { who: 'nara', text: 'Three years, one letter. Grandma Sari is waiting at Pulau Senja — the island of the evening sun.' },
      { who: 'nara', text: 'Fly through the golden rings to find the wind, then land soft on the water. Letters first, always.' },
    ],
    letter: 'Dear Grandma, the sea is calm and your grandson is well. He thinks of you every evening. — With love',
    deliverLines: [
      { who: 'sari', text: 'Oh... my boy is well? Thank you, little pilot. You carry more than paper — you carry hearts.' },
      { who: 'nara', text: 'Every letter finds its sky, Grandma. That is a promise.' },
    ],
  },
  {
    id: 2, name: 'Birthday at the Lighthouse', kind: 'timed', timeLimit: 150, wind: 6,
    sky: 'day', brief: 'Mika turns twelve today at the lighthouse island. The cake is waiting — deliver before the candles melt. A gentle wind pushes from the east.',
    lines: [
      { who: 'nara', text: 'A birthday letter for Mika, twelve today! The lighthouse keeper’s son has never had a letter of his own.' },
      { who: 'nara', text: 'Full throttle, steady hands. A birthday waits for no pilot.' },
    ],
    letter: 'Happy birthday, Mika! Twelve looks good on you. May your year be bright as the lighthouse beam. — Your friend',
    deliverLines: [
      { who: 'mika', text: 'A letter! For ME? On my birthday?! Best birthday ever! Thank you, Nara!' },
      { who: 'nara', text: 'Happy birthday, Mika. Keep looking up — the sky likes you.' },
    ],
  },
  {
    id: 3, name: 'Two Brothers', kind: 'low', timeLimit: 0, wind: 10,
    sky: 'day', brief: 'Fishermen Budi and Agus have not spoken in a year. Carry Budi’s apology low through the canyon between the islands — and stay clear of the storm clouds.',
    lines: [
      { who: 'nara', text: 'Two brothers, one silence, one letter. Budi wrote “I am sorry” and could not say it aloud.' },
      { who: 'nara', text: 'Fly low through the canyon, under the storm clouds. Some words need a quiet road.' },
    ],
    letter: 'Brother, the sea is big enough for both our boats. Forgive me. Come home for supper. — Budi',
    deliverLines: [
      { who: 'agus', text: '...He wrote this? My stubborn brother wrote this? Tell him supper is at six. Tell him I missed him.' },
      { who: 'nara', text: 'I will. Some letters are heavier than cargo — and lighter than air.' },
    ],
  },
  {
    id: 4, name: 'A Love Letter, Unsent for Ten Years', kind: 'fuel', timeLimit: 0, wind: 8,
    sky: 'dusk', brief: 'A love letter kept in a drawer for ten years. Fly at dusk through the rain to the mountain airstrip — watch your fuel, and fly through the fuel rings.',
    lines: [
      { who: 'nara', text: 'Ten years in a drawer. Ten years of “maybe tomorrow”. Tonight, this letter finally flies.' },
      { who: 'nara', text: 'Dusk rain, low fuel. The fuel rings will keep Pipit in the air — fly through them, and do not give up.' },
    ],
    letter: 'I never stopped loving you. Ten years, and still, every sunset spells your name. Meet me where the mountain touches the sky. — Always',
    deliverLines: [
      { who: 'nara', text: 'Delivered. Ten years... and it only took one brave evening. Love is patient. Pilots should be too.' },
    ],
  },
  {
    id: 5, name: 'The Last Letter', kind: 'memorial', timeLimit: 0, wind: 4,
    sky: 'sunset', brief: 'Nara’s own letter — to her late mother, who taught her to fly. Follow the rings as they arc like a heart across the sunset, and land at the memorial hill.',
    lines: [
      { who: 'nara', text: 'Mum taught me to fly before I could ride a bicycle. This letter is mine. The last one.' },
      { who: 'nara', text: 'Follow the rings, Mum. They arc like a heart across the sunset. I am coming home.' },
    ],
    letter: 'Dear Mum, I fly the way you taught me — gently, bravely, and always toward the light. I miss you. I love you. — Nara',
    deliverLines: [
      { who: 'nara', text: 'Every letter finds its sky. Thank you, Mum — for the wings, and for the words.' },
    ],
  },
];
export function missionById(id) { return MISSIONS.find((m) => m.id === id) || MISSIONS[0]; }
