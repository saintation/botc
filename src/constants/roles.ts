import type { RoleType, Alignment } from '../types/character';

export const TROUBLE_BREWING_ROLES: { id: RoleType; name: string; align: Alignment; type: string }[] = [
  { id: 'washerwoman', name: '세탁부', align: 'good', type: 'townsfolk' },
  { id: 'librarian', name: '사서', align: 'good', type: 'townsfolk' },
  { id: 'investigator', name: '조사자', align: 'good', type: 'townsfolk' },
  { id: 'chef', name: '요리사', align: 'good', type: 'townsfolk' },
  { id: 'empath', name: '공감자', align: 'good', type: 'townsfolk' },
  { id: 'fortune_teller', name: '점쟁이', align: 'good', type: 'townsfolk' },
  { id: 'undertaker', name: '장의사', align: 'good', type: 'townsfolk' },
  { id: 'monk', name: '수도승', align: 'good', type: 'townsfolk' },
  { id: 'ravenkeeper', name: '까마귀사육사', align: 'good', type: 'townsfolk' },
  { id: 'virgin', name: '처녀', align: 'good', type: 'townsfolk' },
  { id: 'slayer', name: '학살자', align: 'good', type: 'townsfolk' },
  { id: 'soldier', name: '군인', align: 'good', type: 'townsfolk' },
  { id: 'mayor', name: '시장', align: 'good', type: 'townsfolk' },
  { id: 'butler', name: '집사', align: 'good', type: 'outsider' },
  { id: 'drunk', name: '취객', align: 'good', type: 'outsider' },
  { id: 'recluse', name: '은둔자', align: 'good', type: 'outsider' },
  { id: 'saint', name: '성자', align: 'good', type: 'outsider' },
  { id: 'poisoner', name: '독술사', align: 'evil', type: 'minion' },
  { id: 'spy', name: '스파이', align: 'evil', type: 'minion' },
  { id: 'scarlet_woman', name: '홍등가 여인', align: 'evil', type: 'minion' },
  { id: 'baron', name: '남작', align: 'evil', type: 'minion' },
  { id: 'imp', name: '임프', align: 'evil', type: 'demon' },
];

export const getRoleName = (id?: RoleType | null) => {
  if (!id) return '?';
  return TROUBLE_BREWING_ROLES.find(r => r.id === id)?.name || id;
};
