// source.config.ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
var publicDocs = defineDocs({
  dir: "content/docs/public"
});
var privateDocs = defineDocs({
  dir: "content/docs/private"
});
var source_config_default = defineConfig();
export {
  source_config_default as default,
  privateDocs,
  publicDocs
};
