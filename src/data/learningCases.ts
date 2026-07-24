import { createAnonymousAlias } from '../engine/anonymousAlias.ts'

export type LearningCase = {
  id: string
  authorId: string
  nickname: string
  scenario: string
  title: string
  summary: string
  takeaway: string
  sharedLabel: string
}

const AUTHORS = {
  calm: createAnonymousAlias('public-author-calm'),
  careful: createAnonymousAlias('public-author-careful'),
  bright: createAnonymousAlias('public-author-bright'),
} as const

export const LEARNING_CASES: LearningCase[] = [
  {
    id: 'case-rear-clearance',
    authorId: 'calm',
    nickname: AUTHORS.calm,
    scenario: '양쪽 차량 사이',
    title: '오른쪽 뒤 범퍼 간격 회복',
    summary: '후진 중 가까워진 모서리를 발견하고 정지한 뒤, 방금 경로를 짧게 되돌아갔습니다.',
    takeaway: '간격이 빠르게 줄면 조향보다 완전 정지가 먼저입니다.',
    sharedLabel: '최근 공유',
  },
  {
    id: 'case-crooked',
    authorId: 'calm',
    nickname: AUTHORS.calm,
    scenario: '양쪽 차량 사이',
    title: '비스듬한 차체 다시 평행하게',
    summary: '깊이를 더 맞추기 전에 짧게 전진해 뒤쪽 공간을 만들고 반대 조향으로 재진입했습니다.',
    takeaway: '비스듬하면 깊이보다 차체 각도를 먼저 바로잡습니다.',
    sharedLabel: '3일 전',
  },
  {
    id: 'case-stop-timing',
    authorId: 'careful',
    nickname: AUTHORS.careful,
    scenario: '양쪽 차량 사이',
    title: '앞 범퍼 휩쓸림 전에 정지',
    summary: '뒤만 보지 않고 반대편 앞 모서리의 간격이 줄어드는 순간을 확인했습니다.',
    takeaway: '곡선 후진에서는 뒤쪽과 반대편 앞 모서리를 번갈아 봅니다.',
    sharedLabel: '5일 전',
  },
  {
    id: 'case-recheck',
    authorId: 'careful',
    nickname: AUTHORS.careful,
    scenario: '양쪽 차량 사이',
    title: '수정 후 양쪽 간격 재확인',
    summary: '한쪽 간격을 회복한 뒤 바로 후진하지 않고 반대편에 새 위험이 없는지 다시 확인했습니다.',
    takeaway: '수정 뒤에는 처음 보는 장면처럼 전체 여유를 다시 확인합니다.',
    sharedLabel: '1주 전',
  },
  {
    id: 'case-center',
    authorId: 'bright',
    nickname: AUTHORS.bright,
    scenario: '양쪽 차량 사이',
    title: '주차칸 가운데 위치 맞추기',
    summary: '같은 전진 기어에서 두 번의 짧은 곡선으로 차체를 가운데로 옮겼습니다.',
    takeaway: '큰 한 번의 조작보다 짧은 이동 뒤 다시 확인하는 편이 안전합니다.',
    sharedLabel: '1주 전',
  },
]
