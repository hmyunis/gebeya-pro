import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactRepo: Repository<ContactMessage>,
  ) {}

  async create(dto: CreateContactMessageDto) {
    const record = this.contactRepo.create({
      name: dto.name.trim(),
      contact: dto.contact.trim(),
      message: dto.message.trim(),
      isRead: false,
      readByUserId: null,
      readAt: null,
    });

    const saved = await this.contactRepo.save(record);
    return { id: saved.id, received: true };
  }

  async listAdmin() {
    return this.contactRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async setReadAdmin(id: number, isRead: boolean, adminUserId: number) {
    const msg = await this.contactRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Contact message not found');

    msg.isRead = isRead;
    msg.readAt = isRead ? new Date() : null;
    msg.readByUserId = isRead ? adminUserId : null;

    return this.contactRepo.save(msg);
  }
}
