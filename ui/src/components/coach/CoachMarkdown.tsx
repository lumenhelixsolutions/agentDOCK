import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: "0 0 8px", lineHeight: 1.55 }}>{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: "4px 0 8px", paddingLeft: 18 }}>{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ marginBottom: 4 }}>{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ color: "#ffb042", fontWeight: 600 }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em style={{ opacity: 0.75, fontSize: 12 }}>{children}</em>
  ),
};

export default function CoachMarkdown() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      components={mdComponents as Record<string, React.ComponentType<Record<string, unknown>>>}
      style={{ fontSize: 13, color: "#f5f5f5" }}
    />
  );
}