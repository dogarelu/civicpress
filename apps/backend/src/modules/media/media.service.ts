import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import { createReadStream, ReadStream } from 'fs';
import { Readable } from 'stream';
import sharp from 'sharp';
import type { FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
type FileTypeResult = { ext: string; mime: string };
type FileTypeFromBufferFn = (buf: Buffer) => Promise<FileTypeResult | undefined>;
let _fileTypeFromBuffer: FileTypeFromBufferFn | null = null;

const STORAGE_DIR = path.resolve(__dirname, '../../../storage/media');
const ORIG_DIR = path.join(STORAGE_DIR, 'orig');
const CACHE_DIR = path.join(STORAGE_DIR, 'cache');
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const VARIANT_WIDTHS: Record<string, number> = {
  '45': 45,
  '64': 64,
  '90': 90,
  '160': 160,
  '240': 240,
  '272': 272,
  '500': 500,
  '660': 660,
  '768': 768,
  '1080': 1080,
  orig: 0,
};

const UPLOAD_VARIANTS = [
  { name: 'thumb', width: 160 },
  { name: 'medium', width: 500 },
  { name: 'large', width: 1080 },
];

const MEDIA_BASE = process.env.MEDIA_BASE_URL || 'http://localhost:3000';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async getMeta(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(`Media not found: ${id}`);
    return {
      ...media,
      url: `${MEDIA_BASE}/v1/media/${media.id}/orig`,
    };
  }

  async getFile(
    id: string,
    variant: string,
  ): Promise<{ stream: Readable; mimeType: string; size?: number }> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException(`Media not found: ${id}`);

    const origPath = path.join(ORIG_DIR, media.path);

    if (!fs.existsSync(origPath)) {
      throw new NotFoundException(`Media file not found on disk: ${id}`);
    }

    if (variant === 'orig' || !VARIANT_WIDTHS[variant]) {
      const stat = fs.statSync(origPath);
      return { stream: createReadStream(origPath), mimeType: media.mimeType, size: stat.size };
    }

    const width = VARIANT_WIDTHS[variant];
    const cachePath = path.join(CACHE_DIR, `${id}-${variant}.webp`);
    ensureDir(CACHE_DIR);

    if (!fs.existsSync(cachePath)) {
      await sharp(origPath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(cachePath);
    }

    const stat = fs.statSync(cachePath);
    return { stream: createReadStream(cachePath), mimeType: 'image/webp', size: stat.size };
  }

  async uploadFromRequest(req: FastifyRequest, ownerId: string) {
    const fastifyReq = req as unknown as {
      file: () => Promise<{ filename: string; mimetype: string; file: Readable }>;
    };

    let fileData: { filename: string; mimetype: string; file: Readable };
    try {
      fileData = await fastifyReq.file();
    } catch {
      throw new BadRequestException('No file in request');
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of fileData.file) {
      totalSize += (chunk as Buffer).length;
      if (totalSize > MAX_SIZE) {
        throw new BadRequestException(`File too large (max ${MAX_SIZE / 1024 / 1024}MB)`);
      }
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    if (!_fileTypeFromBuffer) {
      // Dynamic import needed since file-type is ESM-only
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ft = await (eval('import("file-type")') as Promise<any>);
      _fileTypeFromBuffer = ft.fileTypeFromBuffer as FileTypeFromBufferFn;
    }
    const detected = await _fileTypeFromBuffer!(buffer);
    const mimeType = detected?.mime || fileData.mimetype;
    if (!ALLOWED_MIMES.has(mimeType)) {
      throw new BadRequestException(`File type not allowed: ${mimeType}`);
    }

    ensureDir(ORIG_DIR);
    ensureDir(CACHE_DIR);

    const ext = detected?.ext || 'jpg';
    const id = crypto.randomBytes(12).toString('hex');
    const filename = `${id}.${ext}`;
    const origPath = path.join(ORIG_DIR, filename);

    // .rotate() applies EXIF orientation; sharp's pipeline strips metadata by default,
    // and explicitly omitting `.withMetadata(...)` ensures no EXIF survives the round-trip.
    const sharpInstance = sharp(buffer).rotate();
    const metadata = await sharpInstance.metadata();
    await sharpInstance.toFile(origPath);

    const variants: Array<{ name: string; width: number; path: string }> = [];
    for (const v of UPLOAD_VARIANTS) {
      const variantPath = path.join(CACHE_DIR, `${id}-${v.name}.webp`);
      await sharp(origPath)
        .resize({ width: v.width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(variantPath);
      variants.push({ name: v.name, width: v.width, path: variantPath });
    }

    const media = await this.prisma.media.create({
      data: {
        filename,
        mimeType,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        sizeBytes: buffer.length,
        path: filename,
        ownerId,
        variants,
      },
    });

    return {
      id: media.id,
      url: `${MEDIA_BASE}/v1/media/${media.id}/orig`,
      filename: media.filename,
      mimeType: media.mimeType,
      width: media.width,
      height: media.height,
      sizeBytes: media.sizeBytes,
    };
  }

  async list(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const [total, items] = await Promise.all([
      this.prisma.media.count(),
      this.prisma.media.findMany({ skip, take: perPage, orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      media: items.map((m) => ({
        id: m.id,
        url: `${MEDIA_BASE}/v1/media/${m.id}/orig`,
        filename: m.filename,
        mimeType: m.mimeType,
        width: m.width,
        height: m.height,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      page,
      perPage,
    };
  }
}
