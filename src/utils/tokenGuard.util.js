import { encodeText } from "./tokenizer.util.js";

export function trimContext(context, maxTokens = 2500) {
  const tokens = encodeText(context);

  if (tokens.length <= maxTokens) return context;

  return context.slice(0, Math.floor(context.length * 0.7));
}
