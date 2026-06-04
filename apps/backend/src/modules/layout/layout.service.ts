import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LayoutService {
  constructor(private prisma: PrismaService) {}

  async getPublic() {
    let layout = await this.prisma.layoutSetting.findUnique({ where: { id: 'default' } });

    if (!layout) {
      layout = await this.prisma.layoutSetting.create({ data: { id: 'default' } });
    }

    return {
      homeTemplateId: layout.homeTemplateId,
      categoryTemplateId: layout.categoryTemplateId,
      homeTemplateOptions: layout.homeTemplateOptions as Record<string, unknown> | null,
      categoryTemplateOptions: layout.categoryTemplateOptions as Record<string, unknown> | null,
    };
  }
}
