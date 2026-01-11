import { create } from "zustand"
import { persist } from "zustand/middleware"

export type UploadStatus = "idle" | "uploading" | "uploaded" | "error"
export type ProcessingStatus =
  | "idle"
  | "pending"
  | "parsing"
  | "masking"
  | "fast-check"
  | "deep-reason"
  | "complete"
  | "error"

export type RiskLevel = "none" | "low" | "medium" | "high" | "critical"

export interface FileResult {
  riskLevel: RiskLevel
  isCompliant: boolean
  ngWordsCount: number
  piiDetected: number
  summary?: string
}

export interface FileState {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  filePath?: string
  uploadStatus: UploadStatus
  processingStatus: ProcessingStatus
  progress: number
  reportId?: string
  result?: FileResult
  error?: string
  retryCount: number
  createdAt: string
  updatedAt: string
}

interface FileStore {
  files: FileState[]
  selectedFileId: string | null
  isDrawerOpen: boolean

  // Actions
  addFile: (file: Partial<FileState>) => string
  updateFile: (id: string, updates: Partial<FileState>) => void
  removeFile: (id: string) => void
  selectFile: (id: string | null) => void
  openDrawer: () => void
  closeDrawer: () => void
  retryFile: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void
  getProcessingFiles: () => FileState[]
  getFileById: (id: string) => FileState | undefined
}

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      files: [],
      selectedFileId: null,
      isDrawerOpen: false,

      addFile: (file) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const newFile: FileState = {
          id,
          fileName: file.fileName || "unknown",
          fileSize: file.fileSize || 0,
          fileType: file.fileType || "application/pdf",
          filePath: file.filePath,
          uploadStatus: file.uploadStatus || "idle",
          processingStatus: file.processingStatus || "idle",
          progress: file.progress || 0,
          reportId: file.reportId,
          result: file.result,
          error: file.error,
          retryCount: file.retryCount || 0,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          files: [newFile, ...state.files],
        }))
        return id
      },

      updateFile: (id, updates) => {
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? { ...file, ...updates, updatedAt: new Date().toISOString() }
              : file
          ),
        }))
      },

      removeFile: (id) => {
        set((state) => ({
          files: state.files.filter((file) => file.id !== id),
          selectedFileId:
            state.selectedFileId === id ? null : state.selectedFileId,
        }))
      },

      selectFile: (id) => {
        set({ selectedFileId: id, isDrawerOpen: id !== null })
      },

      openDrawer: () => {
        set({ isDrawerOpen: true })
      },

      closeDrawer: () => {
        set({ isDrawerOpen: false, selectedFileId: null })
      },

      retryFile: (id) => {
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? {
                  ...file,
                  uploadStatus: "idle" as UploadStatus,
                  processingStatus: "idle" as ProcessingStatus,
                  progress: 0,
                  error: undefined,
                  retryCount: file.retryCount + 1,
                  updatedAt: new Date().toISOString(),
                }
              : file
          ),
        }))
      },

      clearCompleted: () => {
        set((state) => ({
          files: state.files.filter(
            (file) => file.processingStatus !== "complete"
          ),
        }))
      },

      clearAll: () => {
        set({ files: [], selectedFileId: null, isDrawerOpen: false })
      },

      getProcessingFiles: () => {
        return get().files.filter(
          (file) =>
            file.processingStatus !== "idle" &&
            file.processingStatus !== "complete" &&
            file.processingStatus !== "error"
        )
      },

      getFileById: (id) => {
        return get().files.find((file) => file.id === id)
      },
    }),
    {
      name: "dropletter-files",
      partialize: (state) => ({
        files: state.files,
      }),
    }
  )
)

// Selector hooks for better performance
export const useFiles = () => useFileStore((state) => state.files)
export const useSelectedFile = () => {
  const selectedFileId = useFileStore((state) => state.selectedFileId)
  const files = useFileStore((state) => state.files)
  return files.find((f) => f.id === selectedFileId)
}
export const useIsDrawerOpen = () => useFileStore((state) => state.isDrawerOpen)
