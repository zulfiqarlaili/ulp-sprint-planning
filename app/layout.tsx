import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sprint Planning",
  description: "Release Master and Scrum Master schedule for 2-week sprints",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-start">
            <Nav />
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
