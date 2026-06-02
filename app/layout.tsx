import type { Metadata } from 'next';
import './globals.css';
import MUIThemeProvider from '@/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'RentaCore — Sistema de Gestión Integral Rent-A-Car',
  description: 'Gestión inteligente de flotas, reservas, facturación electrónica y operaciones para empresas de alquiler de vehículos en Argentina.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <MUIThemeProvider>
          {children}
        </MUIThemeProvider>
      </body>
    </html>
  );
}
