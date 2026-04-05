import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: 'Cards',
  description: 'Card games platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
