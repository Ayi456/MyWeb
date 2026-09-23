import type { Plugin } from "vite";

/**
 * Adds canonical / og:url / og:image / twitter:card only when the site
 * origin is known at build time. Without one nothing is emitted rather
 * than guessing a domain.
 */
export function siteMeta(origin: string | undefined): Plugin {
  const base = normalizeOrigin(origin);
  return {
    name: "site-meta",
    transformIndexHtml() {
      if (!base) return [];
      const tag = (attrs: Record<string, string>, name = "meta") => ({
        tag: name,
        attrs,
        injectTo: "head" as const,
      });
      return [
        tag({ rel: "canonical", href: `${base}/` }, "link"),
        tag({ property: "og:url", content: `${base}/` }),
        tag({ property: "og:image", content: `${base}/og.jpg` }),
        tag({ property: "og:image:width", content: "1200" }),
        tag({ property: "og:image:height", content: "630" }),
        tag({ name: "twitter:card", content: "summary_large_image" }),
        tag({ name: "twitter:image", content: `${base}/og.jpg` }),
      ];
    },
  };
}

export function normalizeOrigin(value: string | undefined) {
  if (!value) return "";
  const withScheme = /^https?:\/\//.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return "";
  }
}
