import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calendário Metodologia 2027 | Graduação",
  description: "Atividades, provas, notas e gabaritos da metodologia dos módulos 51 a 54 de 2027.",
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/favicon.svg`,
    shortcut: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/favicon.svg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
