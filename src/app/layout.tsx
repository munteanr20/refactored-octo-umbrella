import type { Metadata } from "next";
import { EB_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import NavigationSpinner from "@/components/navigation-spinner";

const display = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  variable: "--f-display",
});
const body = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--f-body",
});

export const metadata: Metadata = {
  title: {
    default: "Laboratorul de Statistică",
    template: "%s · Laboratorul de Statistică",
  },
  description: "Platformă de laborator pentru Statistică aplicată, 2026–27.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="ro" className={`${display.variable} ${body.variable}`}>
      <body>
      <SiteHeader />
      {children}
      <NavigationSpinner />
      </body>
      </html>
  );
}