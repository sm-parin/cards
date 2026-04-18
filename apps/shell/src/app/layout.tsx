import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Header from '../components/Header';

export const metadata = {
  title: 'Cards — Multiplayer Card Games',
  description: 'Play multiplayer card games online. Black Queen, Jack Thief and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)' }}>
        <AuthProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
