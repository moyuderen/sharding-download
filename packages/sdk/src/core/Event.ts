export default class Event {
  public events: Map<string, Function[]>

  constructor() {
    this.events = new Map()
  }

  on(name: string, callback: Function) {
    if (typeof callback !== 'function') return

    const callbacks = this.events.get(name) || []
    if (!callbacks.includes(callback)) {
      callbacks.push(callback)
      this.events.set(name, callbacks)
    }
  }

  off(name: string, callback?: Function) {
    if (!this.events.has(name)) return

    if (!callback) {
      this.events.delete(name)
      return
    }

    const callbacks = this.events.get(name)?.filter((cb) => cb !== callback) as Function[]
    if (callbacks.length) {
      this.events.set(name, callbacks)
      return
    }

    this.events.delete(name)
  }

  emit(name: string, ...args: any[]) {
    const callbacks = this.events.get(name)
    if (callbacks?.length) {
      for (const callback of [...callbacks]) {
        callback(...args)
      }
    }
  }

  once(name: string, callback: Function) {
    if (typeof callback !== 'function') return

    const onceCallback = (...args: any[]) => {
      try {
        callback(...args)
      } finally {
        this.off(name, onceCallback)
      }
    }
    this.on(name, onceCallback)
  }
}
