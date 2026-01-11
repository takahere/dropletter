import { Inngest } from "inngest"

export const inngest = new Inngest({
  id: "dropletter",
  name: "DropLetter",
  // ローカル開発時は Dev Server を使用（401 Event key not found エラーを回避）
  ...(process.env.NODE_ENV === "development" && {
    isDev: true,
  }),
})
