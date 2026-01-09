import './globals.css'

export const metadata = {
  title: 'Lighthouse France - Service Portal',
  description: 'Equipment Service Request Portal - Calibration & Repair Services',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
