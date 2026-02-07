import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MerchantImageService {
  private readonly uploadPath = path.join(
    process.cwd(),
    'uploads',
    'merchant-profiles',
  );

  constructor() {
    fs.ensureDirSync(this.uploadPath);
  }

  async optimizeAndSave(fileBuffer: Buffer): Promise<string> {
    const filename = `${uuidv4()}.webp`;
    const fullPath = path.join(this.uploadPath, filename);

    await sharp(fileBuffer)
      .resize(512, 512, {
        fit: 'cover',
      })
      .webp({ quality: 82 })
      .toFile(fullPath);

    return `/uploads/merchant-profiles/${filename}`;
  }

  async deleteImage(relativePath: string | null | undefined): Promise<void> {
    if (!relativePath) return;
    if (!relativePath.startsWith('/uploads/merchant-profiles/')) return;
    const fullPath = path.join(process.cwd(), relativePath);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
    }
  }
}
