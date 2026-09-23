import { z } from 'zod'

export const citizenReactionSchema = z.object({
  persona: z.string().min(1),
  text: z.string().min(1),
})

/** Контракт ответа AI из п. 13.3 ТЗ. */
export const aiExplanationSchema = z.object({
  summary: z.string().min(1),
  positives: z.array(z.string().min(1)).min(3).max(3),
  risks: z.array(z.string().min(1)).min(2).max(3),
  recommendation: z.string().min(1),
  citizenReactions: z.array(citizenReactionSchema).length(4),
})

export type AiExplanation = z.infer<typeof aiExplanationSchema>
export type CitizenReaction = z.infer<typeof citizenReactionSchema>

export const explainResponseSchema = z.union([
  z.object({ success: z.literal(true), data: aiExplanationSchema, model: z.string().optional() }),
  z.object({ success: z.literal(false), useFallback: z.literal(true), reason: z.string().optional() }),
])

export type ExplanationSource = 'ai' | 'fallback'
