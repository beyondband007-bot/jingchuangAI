import "./legal.css";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  privacyPolicyMarkdown,
  userAgreementMarkdown,
} from "../../legalDocuments";

const legalDocuments = {
  "user-agreement": {
    title: "用户协议",
    subtitle: "Facemini 用户服务协议",
    markdown: userAgreementMarkdown,
  },
  "privacy-policy": {
    title: "隐私政策",
    subtitle: "Facemini 隐私政策",
    markdown: privacyPolicyMarkdown,
  },
};

export function LegalDocumentPage({ documentKey }) {
  const documentConfig =
    legalDocuments[documentKey] || legalDocuments["user-agreement"];
  const content = documentConfig.markdown.replace(
    /\*\*(mail@facemini\.com)\*\*/g,
    "[$1](mailto:$1)",
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [documentKey]);

  return (
    <main className="legal-page-shell">
      <section className="legal-page-hero">
        <div>
          <span>Facemini Legal</span>
          <h1>{documentConfig.title}</h1>
        </div>
      </section>
      <article className="legal-markdown-card">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a({ href = "", children, ...props }) {
              return (
                <a href={href} {...props}>
                  {children}
                </a>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </main>
  );
}
