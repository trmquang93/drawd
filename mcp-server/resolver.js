import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !path.extname(specifier)) {
    const parentPath = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : process.cwd();

    const withJs = path.resolve(parentPath, specifier + ".js");
    if (existsSync(withJs)) {
      return nextResolve(specifier + ".js", context);
    }

    const withIndex = path.resolve(parentPath, specifier, "index.js");
    if (existsSync(withIndex)) {
      return nextResolve(specifier + "/index.js", context);
    }
  }

  return nextResolve(specifier, context);
}
