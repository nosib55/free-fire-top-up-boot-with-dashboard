import "./globals.css";

export const metadata = {
  title: "AMS Topup",
  description: "AMS Topup - Automated Free Fire & Game Top-Up API SaaS Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

