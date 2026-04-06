import type React from "react"
import type { Metadata } from "next"
import { Karla } from "next/font/google"
import "./globals.css"

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
})

export const metadata: Metadata = {
  title: "COGS Task Management",
  description: "Cognitive Offloading and Getting Stuff Done",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={karla.variable}>
      <body className={karla.className}>{children}</body>
    </html>
  )
}
