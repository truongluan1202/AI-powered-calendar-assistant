"use client";

import "~/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/contexts/ThemeContext";
import Navbar from "~/components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `!function(){try{var t=localStorage.getItem('theme')||'dark';'dark'===t?(document.documentElement.classList.remove('light'),document.documentElement.classList.add('dark')):(document.documentElement.classList.remove('dark'),document.documentElement.classList.add('light'))}catch(e){document.documentElement.classList.remove('light'),document.documentElement.classList.add('dark')}}();`,
          }}
        />
      </head>
      <body className="relative h-screen overflow-auto lg:overflow-hidden">
        {/* Global Background Effects */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {/* Elegant gradient orbs - More visible */}
          <div className="animate-gentle-float absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/25 to-transparent blur-3xl"></div>
          <div className="animate-gentle-float-reverse absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-indigo-500/35 via-pink-500/20 to-transparent blur-3xl"></div>
          <div className="animate-gentle-drift absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-gradient-to-bl from-cyan-500/30 via-blue-500/18 to-transparent blur-2xl"></div>

          {/* Subtle geometric patterns - More visible */}
          <div className="absolute top-20 left-20 h-32 w-32 opacity-50">
            <div className="elegant-pattern-1"></div>
          </div>
          <div className="absolute right-32 bottom-32 h-24 w-24 opacity-40">
            <div className="elegant-pattern-2"></div>
          </div>
          <div className="absolute top-1/3 left-1/2 h-16 w-16 opacity-35">
            <div className="elegant-pattern-3"></div>
          </div>

          {/* Sophisticated grid overlay - More visible */}
          <div className="absolute inset-0 opacity-15">
            <div className="elegant-grid"></div>
          </div>
        </div>

        <ThemeProvider>
          <SessionProvider>
            <TRPCReactProvider>
              <Navbar />
              <main className="relative z-10 h-[calc(100vh-4rem)] overflow-auto lg:overflow-hidden">
                {children}
              </main>
              {/* Debug element to test dark mode */}
              <div className="fixed right-4 bottom-4 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-800">
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Theme: <span id="theme-debug">loading...</span>
                </div>
              </div>
            </TRPCReactProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
