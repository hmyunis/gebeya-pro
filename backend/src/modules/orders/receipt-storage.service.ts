import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReceiptStorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'receipts');

  constructor() {
    fs.ensureDirSync(this.uploadDir);
  }

  async save(buffer: Buffer, originalFilename?: string): Promise<string> {
    const safeExt = this.getSafeExtension(originalFilename);
    const filename = `${uuidv4()}${safeExt}`;
    const fullPath = path.join(this.uploadDir, filename);

    await fs.writeFile(fullPath, buffer);
    return `/uploads/receipts/${filename}`;
  }

  async delete(receiptUrl: string | null | undefined): Promise<void> {
    if (!receiptUrl) return;
    if (!receiptUrl.startsWith('/uploads/receipts/')) return;

    const relative = receiptUrl.replace(/^\//, '');
    const fullPath = path.resolve(process.cwd(), relative);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
    }
  }

  private getSafeExtension(originalFilename?: string): string {
    if (!originalFilename) return '';
    const ext = path.extname(originalFilename).toLowerCase();
    if (!ext) return '';
    if (ext.length > 10) return '';
    if (!/^\.[a-z0-9]+$/.test(ext)) return '';
    return ext;
  }
}
