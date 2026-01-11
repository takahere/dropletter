"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle, AlertCircle, Brain, Shield, FileSearch, Eye, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

export type ProcessingStatus =
  | "idle"
  | "parsing"      // visual-parse: PDF解析中
  | "masking"      // pii-masking: 個人情報マスキング中
  | "fast-check"   // fast-check: NGワード高速チェック中
  | "deep-reason"  // deep-reason: 法的判定中
  | "complete"
  | "error"

interface StatusBadgeProps {
  status: ProcessingStatus
  message?: string
  className?: string
}

const statusConfig: Record<ProcessingStatus, {
  icon: React.ElementType
  label: string
  color: string
  bgColor: string
}> = {
  idle: {
    icon: Brain,
    label: "待機中",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  parsing: {
    icon: FileSearch,
    label: "ドキュメント解析中...",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  masking: {
    icon: Lock,
    label: "個人情報マスキング中...",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950",
  },
  "fast-check": {
    icon: Eye,
    label: "NGワード高速チェック中...",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950",
  },
  "deep-reason": {
    icon: Shield,
    label: "法的チェック中...",
    color: "text-[#FF3300]",
    bgColor: "bg-red-50 dark:bg-red-950",
  },
  complete: {
    icon: CheckCircle,
    label: "完了",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
  error: {
    icon: AlertCircle,
    label: "エラー",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
}

export function StatusBadge({ status, message, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const isProcessing = !["idle", "complete", "error"].includes(status)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        config.bgColor,
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {isProcessing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className={cn("w-4 h-4", config.color)} />
            </motion.div>
          ) : (
            <Icon className={cn("w-4 h-4", config.color)} />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.span
          key={status}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className={cn("text-sm font-medium", config.color)}
        >
          {message || config.label}
        </motion.span>
      </AnimatePresence>

      {isProcessing && (
        <motion.div
          className="flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn("w-1.5 h-1.5 rounded-full", config.color.replace("text-", "bg-"))}
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

// Processing Pipeline Display
interface ProcessingPipelineProps {
  currentStatus: ProcessingStatus
  steps?: ProcessingStatus[]
}

export function ProcessingPipeline({
  currentStatus,
  steps = ["parsing", "masking", "fast-check", "deep-reason"],
}: ProcessingPipelineProps) {
  const currentIndex = steps.indexOf(currentStatus)

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const config = statusConfig[step]
        const Icon = config.icon
        const isActive = step === currentStatus
        const isComplete = currentIndex > index || currentStatus === "complete"
        const isPending = currentIndex < index && currentStatus !== "complete"

        return (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              isActive && config.bgColor,
              isComplete && "bg-green-50 dark:bg-green-950",
              isPending && "opacity-50"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isActive && config.bgColor,
                isComplete && "bg-green-100 dark:bg-green-900",
                isPending && "bg-muted"
              )}
            >
              {isComplete ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : isActive ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className={cn("w-4 h-4", config.color)} />
                </motion.div>
              ) : (
                <Icon className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  isActive && config.color,
                  isComplete && "text-green-600",
                  isPending && "text-muted-foreground"
                )}
              >
                {config.label.replace("...", "")}
              </p>
            </div>

            {isActive && (
              <motion.div
                className="flex gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className={cn("w-1.5 h-1.5 rounded-full", config.color.replace("text-", "bg-"))}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
