import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "CreatorLens — Video Analytics",
  description: "AI-powered social media video comparison",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body className={`${inter.className} min-h-full antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1a1a",
              color: "#f5f5f7",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              fontSize: "14px",
              fontFamily: "inherit",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            },
            success: {
              iconTheme: { primary: "#30d158", secondary: "#000" },
              duration: 4000,
            },
            error: {
              iconTheme: { primary: "#ff453a", secondary: "#000" },
              duration: 6000,
            },
          }}
        />
      </body>
    </html>
  );
}
