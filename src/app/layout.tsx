/* eslint-disable @next/next/no-document-import-in-page */
"use client"

import { useState } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import "leaflet/dist/leaflet.css"
import { Toaster } from "react-hot-toast"
import Chatbot from "@/components/chatbot"
import { usePathname } from "next/navigation"
import { Lock, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserProvider, useUser } from "@/context/UserContext"
import { ThemeProvider } from "@/context/ThemeContext"

const inter = Inter({ subsets: ["latin"] })

function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { isAuthenticated, balance } = useUser()

  return (
    <body className={`${inter.className} min-h-screen dark-mesh-bg flex flex-col`}>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} totalEarnings={balance} />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 lg:p-8 lg:pl-72 transition-all duration-300 min-w-0">
          {pathname !== "/" && !isAuthenticated ? (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
              <div className="relative bg-slate-900/65 backdrop-blur-md rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-800/80 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200 text-slate-100">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-6 shadow-md shadow-red-500/5 text-red-400">
                  <Lock className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-100">Access Restricted</h2>
                <p className="text-slate-400 text-sm mt-2 mb-6">
                  Authentication is required to access this feature. Please log in to report waste, collect waste, claim rewards, or use our AI assistants.
                </p>
                <Button
                  onClick={() => window.dispatchEvent(new Event("openLoginModal"))}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-6 rounded-xl font-bold shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                >
                  <LogIn className="h-5 w-5" />
                  Log In Now
                </Button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <Chatbot />
      <Toaster 
        position="top-center"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          style: {
            zIndex: 99999,
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #1e293b',
          }
        }}
      />
    </body>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>CivicPulse – AI-Powered Civic Management Platform</title>
        <meta name="description" content="CivicPulse – AI-Powered Civic Management Platform" />
      </head>
      <ThemeProvider>
        <UserProvider>
          <AppShell>{children}</AppShell>
        </UserProvider>
      </ThemeProvider>
    </html>
  )
}
