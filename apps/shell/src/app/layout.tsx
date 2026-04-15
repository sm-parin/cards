import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Header from '../components/Header';

export const metadata = {
  title: 'Cards',
  description: 'Card games platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen flex flex-col">
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
