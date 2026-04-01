import { defineDocs, defineConfig } from "fumadocs-mdx/config";

export const publicDocs = defineDocs({
  dir: "content/docs/public",
});

export const privateDocs = defineDocs({
  dir: "content/docs/private",
});

export default defineConfig();
