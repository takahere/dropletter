import type { HighlightComment } from "@/types/comments"

/**
 * Fetch initial comments from Supabase for room hydration
 */
export async function fetchInitialComments(
  reportId: string
): Promise<HighlightComment[]> {
  try {
    const response = await fetch(`/api/reports/${reportId}/comments`)
    const data = await response.json()

    if (!data.success) {
      console.error("Failed to fetch initial comments:", data.error)
      return []
    }

    return data.comments || []
  } catch (error) {
    console.error("Failed to fetch initial comments:", error)
    return []
  }
}
