import { useState, useEffect } from "react"

/**
 * Debounce a value change — useful for search inputs to avoid
 * triggering a fetch on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(searchInput, 350)
 * useEffect(() => { fetchResults(debouncedSearch) }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
