import './globals.css'

export const metadata = {
  title: 'Lighthouse France - RMA Portal',
  description: 'Service de Calibration & Réparation',
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
