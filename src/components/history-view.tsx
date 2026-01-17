'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText,
  Clock,
  Search,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Users,
  User,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HistoryViewSkeleton } from '@/components/ui/skeleton'

interface HistoryViewProps {
  userId: string
  organizations: Array<{ id: string; name: string; slug: string }>
}

interface ReportHistoryItem {
  id: string
  file_name: string
  status: string
  processing_status: string
  created_at: string
  updated_at: string
  riskLevel?: string
}

interface ActivityLogItem {
  id: string
  action_type: string
  target_type: string
  target_id: string
  metadata: Record<string, unknown>
  created_at: string
}

type TabType = 'reports' | 'activity'
type ScopeType = 'personal' | 'team'

export function HistoryView({ userId, organizations }: HistoryViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('reports')
  const [scope, setScope] = useState<ScopeType>('personal')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Reports state
  const [reports, setReports] = useState<ReportHistoryItem[]>([])
  const [reportsTotal, setReportsTotal] = useState(0)

  // Activity state
  const [activities, setActivities] = useState<ActivityLogItem[]>([])
  const [activitiesTotal, setActivitiesTotal] = useState(0)

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        scope,
        ...(selectedOrgId && { organization_id: selectedOrgId }),
        ...(searchQuery && { search: searchQuery }),
        limit: '20',
      })

      const res = await fetch(`/api/history/reports?${params}`)
      const data = await res.json()

      if (data.success) {
        setReports(data.reports || [])
        setReportsTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setIsLoading(false)
    }
  }, [scope, selectedOrgId, searchQuery])

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        scope,
        ...(selectedOrgId && { organization_id: selectedOrgId }),
        limit: '50',
      })

      const res = await fetch(`/api/history?${params}`)
      const data = await res.json()

      if (data.success) {
        setActivities(data.logs || [])
        setActivitiesTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setIsLoading(false)
    }
  }, [scope, selectedOrgId])

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports()
    } else {
      fetchActivities()
    }
  }, [activeTab, fetchReports, fetchActivities])

  // Risk level badge
  const RiskBadge = ({ level }: { level?: string }) => {
    const config = {
      none: { color: 'bg-green-100 text-green-700', label: '問題なし' },
      low: { color: 'bg-blue-100 text-blue-700', label: '低リスク' },
      medium: { color: 'bg-yellow-100 text-yellow-700', label: '中リスク' },
      high: { color: 'bg-orange-100 text-orange-700', label: '高リスク' },
      critical: { color: 'bg-red-100 text-red-700', label: '危険' },
    }
    const { color, label } = config[level as keyof typeof config] || config.none
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', color)}>
        {label}
      </span>
    )
  }

  // Action type label
  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'report.created': 'レポート作成',
      'report.viewed': 'レポート閲覧',
      'report.shared': 'レポート共有',
      'report.deleted': 'レポート削除',
      'comment.added': 'コメント追加',
      'comment.resolved': 'コメント解決',
      'comment.deleted': 'コメント削除',
      'human_review.requested': '有人判定リクエスト',
      'human_review.completed': '有人判定完了',
      'subscription.started': 'サブスク開始',
      'subscription.canceled': 'サブスク解約',
    }
    return labels[actionType] || actionType
  }

  return (
    <div className="space-y-6">
      {/* Tabs and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === 'reports'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="w-4 h-4 inline-block mr-2" />
            チェック履歴
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === 'activity'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="w-4 h-4 inline-block mr-2" />
            アクティビティ
          </button>
        </div>

        {/* Scope selector */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setScope('personal')
              setSelectedOrgId(null)
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
              scope === 'personal'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-muted'
            )}
          >
            <User className="w-4 h-4" />
            個人
          </button>
          {organizations.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setScope('team')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
                  scope === 'team'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                )}
              >
                <Users className="w-4 h-4" />
                チーム
                <ChevronDown className="w-4 h-4" />
              </button>
              {scope === 'team' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-background border rounded-lg shadow-lg py-1 z-10">
                  {organizations.map(org => (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrgId(org.id)}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-muted',
                        selectedOrgId === org.id && 'bg-muted'
                      )}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search (reports only) */}
      {activeTab === 'reports' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ファイル名で検索..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <HistoryViewSkeleton />
      ) : activeTab === 'reports' ? (
        /* Reports list */
        <div className="space-y-2">
          {reports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>チェック履歴がありません</p>
            </div>
          ) : (
            reports.map(report => (
              <Link
                key={report.id}
                href={`/share/${report.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors group gap-3"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium group-hover:text-primary transition-colors truncate">
                      {report.file_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-13 sm:pl-0">
                  <RiskBadge level={report.riskLevel} />
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </div>
              </Link>
            ))
          )}

          {reportsTotal > reports.length && (
            <div className="text-center pt-4">
              <button className="text-sm text-primary hover:underline">
                さらに表示 ({reportsTotal - reports.length}件)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Activity list */
        <div className="space-y-2">
          {activities.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>アクティビティがありません</p>
            </div>
          ) : (
            activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-4 bg-card border rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  {activity.action_type.includes('report') ? (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  ) : activity.action_type.includes('comment') ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {getActionLabel(activity.action_type)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                {activity.target_id && activity.target_type === 'report' && (
                  <Link
                    href={`/share/${activity.target_id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    詳細
                  </Link>
                )}
              </div>
            ))
          )}

          {activitiesTotal > activities.length && (
            <div className="text-center pt-4">
              <button className="text-sm text-primary hover:underline">
                さらに表示 ({activitiesTotal - activities.length}件)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
