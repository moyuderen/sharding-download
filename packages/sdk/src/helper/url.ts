export const appendActionQuery = (action: string, query: string) => {
  const queryPrefix = action.includes('?') ? '&' : '?'
  return `${action}${queryPrefix}${query}`
}
