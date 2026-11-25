"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { getUserByEmail, getUserBalance } from "@/utils/db/actions"

type User = {
  id: number
  email: string
  name: string
  role?: string
}

type UserContextType = {
  user: User | null
  balance: number
  isAuthenticated: boolean
  isLoading: boolean
  refreshUser: () => Promise<void>
  refreshBalance: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  balance: 0,
  isAuthenticated: false,
  isLoading: true,
  refreshUser: async () => {},
  refreshBalance: async () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refreshBalance = useCallback(async (userId?: number) => {
    const id = userId ?? user?.id
    if (!id) return
    try {
      const bal = await getUserBalance(id)
      setBalance(bal)
    } catch (e) {
      console.error("Error fetching balance:", e)
    }
  }, [user?.id])

  const refreshUser = useCallback(async () => {
    try {
      // Primary: HTTP-only session cookie via /api/auth/me
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setIsAuthenticated(true)
        const bal = await getUserBalance(data.user.id)
        setBalance(bal)
        setIsLoading(false)
        return
      }

      // No active server session - clear any stale localStorage
      localStorage.removeItem("userEmail")
      localStorage.removeItem("userName")
      localStorage.removeItem("userRole")
      setUser(null)
      setBalance(0)
      setIsAuthenticated(false)
    } catch (e) {
      console.error("Error verifying user session:", e)
      setUser(null)
      setBalance(0)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
    const handleAuthChange = () => refreshUser()
    const handleBalanceUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail === "number") setBalance(detail)
    }
    window.addEventListener("authChanged", handleAuthChange)
    window.addEventListener("balanceUpdated", handleBalanceUpdate)
    window.addEventListener("storage", handleAuthChange)
    return () => {
      window.removeEventListener("authChanged", handleAuthChange)
      window.removeEventListener("balanceUpdated", handleBalanceUpdate)
      window.removeEventListener("storage", handleAuthChange)
    }
  }, [refreshUser])

  return (
    <UserContext.Provider value={{ user, balance, isAuthenticated, isLoading, refreshUser, refreshBalance }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
