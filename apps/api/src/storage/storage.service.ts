import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Local by default; set FILE_STORAGE=s3 + S3_* env for S3-compatible storage.
 * S3 upload path is stubbed so Hostinger can start without object storage.
 */
@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  mode() {
    return this.config.get<string>('FILE_STORAGE', 'local');
  }

  async saveLocal(params: {
    originalName: string;
    buffer: Buffer;
    folder?: string;
  }) {
    const folder = params.folder || 'uploads';
    const root = this.config.get<string>('UPLOAD_DIR', './uploads');
    const dir = join(root, folder);
    await mkdir(dir, { recursive: true });
    const storedName = `${Date.now()}-${randomUUID()}-${params.originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fullPath = join(dir, storedName);
    await writeFile(fullPath, params.buffer);
    return {
      storage: 'local' as const,
      storedName,
      storageKey: join(folder, storedName),
      path: fullPath,
    };
  }

  /** Future: wire @aws-sdk/client-s3 when FILE_STORAGE=s3 */
  s3Configured() {
    return Boolean(
      this.config.get('S3_BUCKET') &&
        this.config.get('S3_ACCESS_KEY') &&
        this.config.get('S3_SECRET_KEY'),
    );
  }
}
