import { Layout } from '@/components/layout/Layout'

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Layout>{children}</Layout>
}
