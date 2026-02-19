import type { ToolErrorCode } from './types.js';

export function toToolResponse<T extends Record<string, unknown>>(payload: T) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
  };
}

export function toToolError(
  code: ToolErrorCode,
  message: string,
  hint?: string,
  extras?: Record<string, unknown>
) {
  const payload = {
    error: {
      code,
      message,
      hint,
    },
    ...(extras ?? {}),
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
    isError: true,
  };
}
