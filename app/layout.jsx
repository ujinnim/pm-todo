import "./globals.css"

export const metadata = {
  title: "PM Todo",
  description: "프로젝트 관리 할 일 앱",
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
