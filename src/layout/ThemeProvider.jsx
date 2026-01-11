import { createContext, useContext, useEffect, useState, useMemo } from "react"

function getSystemTheme() {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

const initialState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "whizmanage-theme",
  ...props
}) {
  const [theme, setThemeState] = useState(
    () => (localStorage.getItem(storageKey)) || defaultTheme
  )
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme())

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  // Calculate resolved theme
  const resolvedTheme = useMemo(() => {
    return theme === "system" ? systemTheme : theme
  }, [theme, systemTheme])

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = (newTheme) => {
    localStorage.setItem(storageKey, newTheme)
    setThemeState(newTheme)
  }

  const value = {
    theme,
    resolvedTheme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
