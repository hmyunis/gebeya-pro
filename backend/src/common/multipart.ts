import {
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

type MultipartFileLike = {
  fieldname?: string;
  filename?: string;
  mimetype?: string;
  file?: AsyncIterable<unknown> & {
    truncated?: boolean;
    resume?: () => void;
  };
};

export function assertMultipartRequest(
  req: FastifyRequest,
  message = 'Expected multipart/form-data',
) {
  const contentType = String(req.headers['content-type'] ?? '');
  if (!contentType.includes('multipart/form-data')) {
    throw new BadRequestException(message);
  }
}

export async function readMultipartFileToBuffer(
  part: MultipartFileLike,
  options: {
    maxBytes: number;
    allowedMimePrefixes?: string[];
    errorLabel?: string;
  },
): Promise<Buffer> {
  const {
    maxBytes,
    allowedMimePrefixes = [],
    errorLabel = 'Uploaded file',
  } = options;

  const mime = String(part.mimetype ?? '').toLowerCase();
  if (
    allowedMimePrefixes.length > 0 &&
    !allowedMimePrefixes.some((prefix) => mime.startsWith(prefix))
  ) {
    throw new BadRequestException(
      `${errorLabel} must match: ${allowedMimePrefixes.join(', ')}`,
    );
  }

  if (!part.file) {
    throw new BadRequestException(`${errorLabel} stream is missing`);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of part.file) {
    const next =
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
    totalBytes += next.length;
    if (totalBytes > maxBytes) {
      await drainMultipartFile(part);
      throw new PayloadTooLargeException(
        `${errorLabel} exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)}MB`,
      );
    }
    chunks.push(next);
  }

  if (part.file.truncated) {
    throw new PayloadTooLargeException(`${errorLabel} is too large`);
  }

  return Buffer.concat(chunks, totalBytes);
}

export function coerceMultipartFieldValue(
  value: unknown,
  fieldName: string,
  maxBytes = 10_000,
): string {
  const normalized = typeof value === 'string' ? value : String(value ?? '');
  if (Buffer.byteLength(normalized, 'utf8') > maxBytes) {
    throw new PayloadTooLargeException(
      `Field "${fieldName}" exceeds ${maxBytes} bytes`,
    );
  }
  return normalized;
}

export async function drainMultipartFile(part: MultipartFileLike): Promise<void> {
  if (!part.file) return;

  try {
    for await (const _chunk of part.file) {
      // drain stream
    }
  } catch {
    part.file.resume?.();
  }
}
