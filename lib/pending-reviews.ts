/**
 * lib/pending-reviews.ts — Which end-of-period reviews are still due
 */
import type { PeriodReview, ReviewPeriod } from "@/lib/types"
import { REVIEW_PERIODS, getPeriodKey, previousPeriodDate } from "@/lib/reviews-store"

export type PendingReviewMap = Record<ReviewPeriod, { key: string; needed: boolean }>

export function getPendingReviews(reviews: PeriodReview[], now = new Date()): PendingReviewMap {
  const map = {} as PendingReviewMap
  REVIEW_PERIODS.forEach((period) => {
    const key = getPeriodKey(period, previousPeriodDate(period, now))
    const done = reviews.some((r) => r.period === period && r.periodKey === key)
    map[period] = { key, needed: !done }
  })
  return map
}

export function countPendingReviews(reviews: PeriodReview[], now = new Date()): number {
  const pending = getPendingReviews(reviews, now)
  return REVIEW_PERIODS.filter((p) => pending[p].needed).length
}
