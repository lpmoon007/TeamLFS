// Solo routes render inside a `.soloui` wrapper; the scoped stylesheet + fonts are
// loaded globally in the root layout, so this is a passthrough.
export default function SoloLayout({ children }: { children: React.ReactNode }) {
  return children;
}
