import type { Metadata } from 'next'
import './globals.css'
import { ERPProvider } from '@/lib/context'
import { AppLayout } from '@/components/AppLayout'

export const metadata: Metadata = {
  title: 'Cpsystem',
  description: 'ERP System'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ERPProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </ERPProvider>
      </body>
    </html>
  )
}
