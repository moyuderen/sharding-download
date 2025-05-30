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

  off(name: string, callback: Function) {
    if (!this.events.has(name)) return

    if (!callback) {
      this.events.set(name, [])
      return
    }

    const callbacks = this.events.get(name)?.filter((cb) => cb !== callback) as Function[]
    this.events.set(name, callbacks)
  }

  emit(name: string, ...args: any[]) {
    const callbacks = this.events.get(name)
    if (callbacks && callbacks.length) {
      callbacks.forEach((cb) => cb(...args))
    }
  }

  once(name: string, callback: Function) {
    if (typeof callback !== 'function') return

    const onceCallback = (...args: any[]) => {
      callback(...args)
      this.off(name, onceCallback)
    }
    this.on(name, onceCallback)
  }
}
