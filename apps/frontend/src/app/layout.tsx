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
            __html: `!function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');'dark'===t?(document.documentElement.classList.remove('light'),document.documentElement.classList.add('dark')):(document.documentElement.classList.remove('dark'),document.documentElement.classList.add('light'))}catch(e){document.documentElement.classList.remove('dark'),document.documentElement.classList.add('light')}}();`,
          }}
        />
      </head>
      <body className="gradient-bg h-screen overflow-auto lg:overflow-hidden">
        <ThemeProvider>
          <SessionProvider>
            <TRPCReactProvider>
              <Navbar />
              <main className="h-[calc(100vh-4rem)] overflow-auto lg:overflow-hidden">
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
