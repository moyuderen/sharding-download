export type Func = (...args: any[]) => any

export default class Event {
  events: Map<string, Set<Func>>

  constructor() {
    this.events = new Map()
  }

  on(name: string, func: Func) {
    const funcs = this.events.get(name)

    if (!funcs) {
      this.events.set(name, new Set([func]))
    } else {
      if (funcs.has(func)) {
        return
      }
      funcs.add(func)
    }
  }

  emit(name: string, ...args: any[]) {
    const funcs = this.events.get(name)
    if (!funcs) {
      return
    }

    for (let func of funcs.values()) {
      func(...args)
    }
  }

  off(name: string, func: Func) {
    const funcs = this.events.get(name)
    if (!funcs) return

    funcs.delete(func)
  }

  once(name: string, func: Func) {
    const on = (...args: any[]) => {
      func.apply(this, args)
      this.off(name, on)
    }
    on.func = func
    this.on(name, on)
  }
}
