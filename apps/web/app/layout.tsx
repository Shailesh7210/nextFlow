import './globals.css'
import React from 'react'

export const metadata = {
  title: 'NexFlow | Visual Workflow Automation Platform',
  description: 'Self-hosted visual workflow automation engine with async Celery execution, WebSockets, and RAG knowledge retrieval.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="w-full h-full m-0 p-0 overflow-hidden">{children}</body>
    </html>
  )
}
