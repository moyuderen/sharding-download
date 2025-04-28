/// <reference types="vite/client" />

declare class AggregateError extends Error {
  errors: any[]
  constructor(errors: any[], message?: string)
}