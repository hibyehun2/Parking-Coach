import { supabase } from '../engine/supabaseClient.ts'
import type { ScenarioRuntime } from '../types/practice.ts'
import type { VehicleState } from '../engine/vehiclePhysics.ts'

export type LearningCase = {
  id: string
  authorId: string
  nickname: string
  scenario: string
  title: string
  summary: string
  takeaway: string
  sharedLabel: string
  runtime?: ScenarioRuntime
  vehicleSnapshot?: VehicleState
}

type LearningCaseRow = {
  id: string
  nickname: string
  completed_date: string
  scenario_title: string
  practice_type: '직접 연습' | '판단 연습'
  outcome: '안전 완료' | '안전 주차' | '복기 필요'
  collision_count: number
  learning_points: string[]
  runtime?: ScenarioRuntime
  vehicle_snapshot?: VehicleState
}

function formatSharedDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function toLearningCase(row: LearningCaseRow): LearningCase {
  const learningPoints = Array.isArray(row.learning_points) ? row.learning_points.filter(Boolean) : []
  const collisionSummary = row.practice_type === '판단 연습'
    ? (row.outcome === '연습 완료' || row.outcome === '안전 주차' 
      ? '위험 상황 판단을 완벽하게 마친 판단 연습 기록입니다.' 
      : '아쉬운 판단을 다시 확인하며 복기한 판단 연습 기록입니다.')
    : row.collision_count > 0
      ? `충돌 ${row.collision_count}회를 복기한 ${row.practice_type} 기록입니다.`
      : `충돌 없이 마친 ${row.practice_type} 기록입니다.`

  return {
    id: row.id,
    // 공개 데이터에는 계정 식별자를 포함하지 않으므로 공개 닉네임으로 사례를 묶습니다.
    authorId: row.nickname,
    nickname: row.nickname,
    scenario: row.scenario_title,
    title: `${row.scenario_title} · ${row.outcome === '안전 완료' ? '안전 주차' : row.outcome}`,
    summary: collisionSummary,
    takeaway: learningPoints[0] ?? '연습 결과를 살펴보고 내 주차 판단에 적용해보세요.',
    sharedLabel: formatSharedDate(row.completed_date),
    runtime: row.runtime,
    vehicleSnapshot: row.vehicle_snapshot,
  }
}

export async function loadLearningCases(): Promise<LearningCase[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('learning_cases')
    .select('id,nickname,completed_date,scenario_title,practice_type,outcome,collision_count,learning_points,runtime,vehicle_snapshot')
    .not('runtime', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error
  return (data as LearningCaseRow[]).map(toLearningCase)
}
