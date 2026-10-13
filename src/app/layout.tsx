import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resource Reserve",
  description: "Manage shared spaces and equipment reservations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Resource Reserve home">
            <span className="brand-icon" aria-hidden="true">R</span>
            <span>Resource<span className="brand-light">Reserve</span></span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link href="/">Overview</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/reservations">Reservations</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">Resource Reserve <span>·</span> Shared resources, thoughtfully managed.</footer>
      </body>
    </html>
  );
}
