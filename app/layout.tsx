export const metadata = {
  title: "Festival Ground Interactive",
  description: "Clickable flier, phone lock screen, and 3D trash viewer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
