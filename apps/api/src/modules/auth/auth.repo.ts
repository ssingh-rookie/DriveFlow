import type { Org, OrgRole, RefreshToken, User, UserOrg } from '@prisma/client'
import type { PrismaService } from '../../core/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

export interface AuthEvent {
  userId: string
  event: string
  metadata: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export interface UserWithOrgs extends User {
  orgs: (UserOrg & {
    org: {
      id: string
      name: string
    }
  })[]
}

export interface RefreshTokenData {
  id: string
  userId: string
  jti: string
  rotationId: string
  tokenHash: string
  used: boolean
  expiresAt: Date
  createdAt: Date
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===== User Operations =====

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  async findUserByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      // Include password field for authentication
    })
  }

  async createUser(data: {
    email: string
    fullName: string
    password: string
    phone?: string
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    })
  }

  async verifyUserExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    return !!user
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  async findUserWithOrgs(userId: string): Promise<UserWithOrgs | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgs: {
          include: {
            org: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })
  }

  async updateUser(userId: string, data: Partial<Pick<User, 'fullName' | 'phone' | 'password'>>): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  }

  // ===== Organization Operations =====

  async getUserPrimaryOrg(userId: string): Promise<UserOrg | null> {
    return this.prisma.userOrg.findFirst({
      where: { userId },
      orderBy: [
        { role: 'asc' }, // Owner first, then admin, etc.
        { createdAt: 'asc' }, // Earliest first
      ],
    })
  }

  async getUserOrgByRole(userId: string, orgId: string, role: OrgRole): Promise<UserOrg | null> {
    return this.prisma.userOrg.findFirst({
      where: {
        userId,
        orgId,
        role,
      },
    })
  }

  async getUserOrganizations(userId: string): Promise<UserOrg[]> {
    return this.prisma.userOrg.findMany({
      where: { userId },
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  }

  async isUserMemberOfOrg(userId: string, orgId: string): Promise<boolean> {
    const userOrg = await this.prisma.userOrg.findFirst({
      where: { userId, orgId },
      select: { id: true },
    })
    return !!userOrg
  }

  async createOrganization(data: { name: string }): Promise<Org> {
    return this.prisma.org.create({
      data,
    })
  }

  async addUserToOrg(userId: string, orgId: string, role: OrgRole): Promise<UserOrg> {
    return this.prisma.userOrg.create({
      data: {
        userId,
        orgId,
        role,
      },
    })
  }

  // ===== Refresh Token Operations =====

  async createRefreshToken(data: {
    userId: string
    jti: string
    rotationId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data,
    })
  }

  async findRefreshTokenByJti(jti: string): Promise<RefreshTokenData | null> {
    return this.prisma.refreshToken.findUnique({
      where: { jti },
    })
  }

  async markRefreshTokenAsUsed(jti: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { jti },
      data: { used: true },
    })
  }

  async revokeRefreshTokensByRotationId(rotationId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { rotationId },
      data: { used: true },
    })
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { used: true },
    })
  }

  async cleanupExpiredRefreshTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { used: true },
        ],
      },
    })
    return result.count
  }

  async countUserActiveRefreshTokens(userId: string): Promise<number> {
    return this.prisma.refreshToken.count({
      where: {
        userId,
        used: false,
        expiresAt: { gt: new Date() },
      },
    })
  }

  async getUserRefreshTokens(userId: string): Promise<RefreshTokenData[]> {
    return this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async deleteRefreshToken(jti: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { jti },
    })
  }

  // ===== Permission Operations =====

  async getUserPermissions(userId: string, orgId: string): Promise<{
    role: OrgRole
    assignedStudentIds?: string[]
    childStudentIds?: string[]
  } | null> {
    const userOrg = await this.prisma.userOrg.findFirst({
      where: { userId, orgId },
    })

    if (!userOrg) {
      return null
    }

    const result: {
      role: OrgRole
      assignedStudentIds?: string[]
      childStudentIds?: string[]
    } = {
      role: userOrg.role,
    }

    // For instructors, get assigned students
    if (userOrg.role === 'instructor') {
      const instructor = await this.prisma.instructor.findFirst({
        where: { userId, orgId },
        include: {
          bookings: {
            select: { studentId: true },
            distinct: ['studentId'],
          },
        },
      })

      if (instructor) {
        result.assignedStudentIds = instructor.bookings.map(b => b.studentId)
      }
    }

    // For parents/guardians, get child students
    if (userOrg.role === 'student') {
      const guardianships = await this.prisma.studentGuardian.findMany({
        where: {
          guardian: {
            email: (await this.prisma.user.findUnique({ where: { id: userId } }))?.email,
          },
        },
        select: { studentId: true },
      })

      result.childStudentIds = guardianships.map(g => g.studentId)
    }

    return result
  }

  // ===== Audit Logging =====

  async logAuthEvent(event: AuthEvent): Promise<void> {
    // Console log for immediate debugging
    console.log(`Auth Event: ${event.event}`, {
      userId: event.userId,
      timestamp: new Date().toISOString(),
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    })

    // Write to database audit log if orgId is provided
    if (event.metadata?.orgId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            orgId: event.metadata.orgId,
            actorUserId: event.userId,
            action: event.event,
            entityType: 'Auth',
            entityId: event.userId,
            after: event.metadata,
            ip: event.ipAddress || 'unknown',
          },
        })
      }
      catch (error) {
        // Don't fail auth operations due to audit log failures
        console.error('Failed to write audit log:', error)
      }
    }
  }

  async logSecurityEvent(data: {
    userId?: string
    event: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    details: Record<string, any>
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    const logData = {
      timestamp: new Date().toISOString(),
      event: data.event,
      severity: data.severity,
      userId: data.userId,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }

    // Always log security events to console
    console.warn(`Security Event [${data.severity.toUpperCase()}]: ${data.event}`, logData)

    // For critical security events, you might want to send alerts
    if (data.severity === 'critical') {
      console.error('CRITICAL SECURITY EVENT:', logData)
      // TODO: Integrate with alerting system (e.g., send to Slack, email, etc.)
    }
  }

  // ===== Health and Maintenance =====

  async getActiveUserCount(): Promise<number> {
    return this.prisma.user.count({
      where: {
        orgs: {
          some: {}, // Has at least one organization
        },
      },
    })
  }

  async getRefreshTokenStats(): Promise<{
    total: number
    active: number
    expired: number
    used: number
  }> {
    const now = new Date()

    const [total, active, expired, used] = await Promise.all([
      this.prisma.refreshToken.count(),
      this.prisma.refreshToken.count({
        where: {
          used: false,
          expiresAt: { gt: now },
        },
      }),
      this.prisma.refreshToken.count({
        where: {
          expiresAt: { lte: now },
        },
      }),
      this.prisma.refreshToken.count({
        where: { used: true },
      }),
    ])

    return { total, active, expired, used }
  }
}
