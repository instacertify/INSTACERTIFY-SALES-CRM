import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        phone: true,
        skills: true,
        createdAt: true,
        employee: true,
      },
    });
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        phone: true,
        skills: true,
        createdAt: true,
        updatedAt: true,
        employee: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
    skills?: string;
    department?: string;
    title?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role ?? 'SALES_OPS',
        phone: data.phone,
        skills: data.skills ?? '',
        employee:
          data.department || data.title
            ? {
                create: {
                  department: data.department,
                  title: data.title,
                },
              }
            : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        phone: true,
        skills: true,
        employee: true,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      role?: string;
      active?: boolean;
      phone?: string | null;
      skills?: string;
      password?: string;
      department?: string;
      title?: string;
    },
  ) {
    await this.get(id);
    const update: Prisma.UserUpdateInput = {
      name: data.name,
      role: data.role,
      active: data.active,
      phone: data.phone,
      skills: data.skills,
    };
    if (data.password) {
      update.passwordHash = await bcrypt.hash(data.password, 10);
    }
    if (data.department !== undefined || data.title !== undefined) {
      update.employee = {
        upsert: {
          create: {
            department: data.department,
            title: data.title,
          },
          update: {
            department: data.department,
            title: data.title,
          },
        },
      };
    }
    return this.prisma.user.update({
      where: { id },
      data: update,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        phone: true,
        skills: true,
        employee: true,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: { id: true, active: true },
    });
  }
}
