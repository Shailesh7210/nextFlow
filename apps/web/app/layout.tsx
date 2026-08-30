import './globals.css'
import React from 'react'

export const metadata = {
  title: 'NexFlow Editor',
  description: 'Visual Workflow Automation Canvas',
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
