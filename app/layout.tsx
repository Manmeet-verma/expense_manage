import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expense Manager",
  description: "Track and manage your expenses with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
