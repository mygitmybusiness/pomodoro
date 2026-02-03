export {}

declare global {
  interface Window {
    settings: {
      getAll: () => Promise<Record<string, unknown>>
      setAll: (partial: Record<string, unknown>) => Promise<Record<string, unknown>>
      set: (key: string, value: unknown) => Promise<Record<string, unknown>>
    },
    timer: {
    tick: (remainingSec: number, isRunning: boolean) => void
    }
  }
}
