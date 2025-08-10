import { Test, TestingModule } from '@nestjs/testing';
import { AuthRepository, UserWithOrgs, RefreshTokenData } from './auth.repo';
import { PrismaService } from '../../core/prisma/prisma.service';
import { User, UserOrg, RefreshToken, OrgRole } from '@prisma/client';

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let prismaService: PrismaService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'Test User',
    phone: '+61400000000',
    password: 'hashed-password',
    externalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserOrg: UserOrg = {
    id: 'user-org-1',
    userId: 'user-1',
    orgId: 'org-1',
    role: OrgRole.instructor,
    createdAt: new Date(),
  };

  const mockRefreshToken: RefreshToken = {
    id: 'token-1',
    userId: 'user-1',
    jti: 'jti-123',
    rotationId: 'rotation-1',
    tokenHash: 'hashed-token',
    used: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    userOrg: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    instructor: {
      findFirst: jest.fn(),
    },
    studentGuardian: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' }
      });
    });
  });

  describe('findUserWithOrgs', () => {
    it('should find user with organizations', async () => {
      const mockUserWithOrgs: UserWithOrgs = {
        ...mockUser,
        orgs: [{
          ...mockUserOrg,
          org: {
            id: 'org-1',
            name: 'Test Org'
          }
        }]
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithOrgs);

      const result = await repository.findUserWithOrgs('user-1');

      expect(result).toEqual(mockUserWithOrgs);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          orgs: {
            include: {
              org: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const updateData = { fullName: 'Updated Name', phone: '+61400000001' };
      const updatedUser = { ...mockUser, ...updateData, updatedAt: new Date() };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await repository.updateUser('user-1', updateData);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          ...updateData,
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('getUserPrimaryOrg', () => {
    it('should get user primary organization', async () => {
      mockPrismaService.userOrg.findFirst.mockResolvedValue(mockUserOrg);

      const result = await repository.getUserPrimaryOrg('user-1');

      expect(result).toEqual(mockUserOrg);
      expect(mockPrismaService.userOrg.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [
          { role: 'asc' },
          { createdAt: 'asc' }
        ]
      });
    });
  });

  describe('createRefreshToken', () => {
    it('should create refresh token', async () => {
      const tokenData = {
        userId: 'user-1',
        jti: 'jti-123',
        rotationId: 'rotation-1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(),
      };

      mockPrismaService.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await repository.createRefreshToken(tokenData);

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: tokenData
      });
    });
  });

  describe('findRefreshTokenByJti', () => {
    it('should find refresh token by JTI', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);

      const result = await repository.findRefreshTokenByJti('jti-123');

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { jti: 'jti-123' }
      });
    });
  });

  describe('markRefreshTokenAsUsed', () => {
    it('should mark refresh token as used', async () => {
      mockPrismaService.refreshToken.update.mockResolvedValue(mockRefreshToken);

      await repository.markRefreshTokenAsUsed('jti-123');

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { jti: 'jti-123' },
        data: { used: true }
      });
    });
  });

  describe('revokeRefreshTokensByRotationId', () => {
    it('should revoke refresh tokens by rotation ID', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await repository.revokeRefreshTokensByRotationId('rotation-1');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { rotationId: 'rotation-1' },
        data: { used: true }
      });
    });
  });

  describe('revokeAllUserRefreshTokens', () => {
    it('should revoke all user refresh tokens', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await repository.revokeAllUserRefreshTokens('user-1');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { used: true }
      });
    });
  });

  describe('cleanupExpiredRefreshTokens', () => {
    it('should cleanup expired refresh tokens', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 10 });

      const result = await repository.cleanupExpiredRefreshTokens();

      expect(result).toBe(10);
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { used: true }
          ]
        }
      });
    });
  });

  describe('getUserPermissions', () => {
    it('should get user permissions for instructor', async () => {
      mockPrismaService.userOrg.findFirst.mockResolvedValue(mockUserOrg);
      mockPrismaService.instructor.findFirst.mockResolvedValue({
        id: 'instructor-1',
        bookings: [
          { studentId: 'student-1' },
          { studentId: 'student-2' }
        ]
      });

      const result = await repository.getUserPermissions('user-1', 'org-1');

      expect(result).toEqual({
        role: OrgRole.instructor,
        assignedStudentIds: ['student-1', 'student-2']
      });
    });

    it('should return null if user not in organization', async () => {
      mockPrismaService.userOrg.findFirst.mockResolvedValue(null);

      const result = await repository.getUserPermissions('user-1', 'org-1');

      expect(result).toBeNull();
    });
  });

  describe('getActiveUserCount', () => {
    it('should get active user count', async () => {
      mockPrismaService.user.count.mockResolvedValue(42);

      const result = await repository.getActiveUserCount();

      expect(result).toBe(42);
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          orgs: {
            some: {}
          }
        }
      });
    });
  });

  describe('getRefreshTokenStats', () => {
    it('should get refresh token statistics', async () => {
      mockPrismaService.refreshToken.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75)  // active
        .mockResolvedValueOnce(15)  // expired
        .mockResolvedValueOnce(10); // used

      const result = await repository.getRefreshTokenStats();

      expect(result).toEqual({
        total: 100,
        active: 75,
        expired: 15,
        used: 10
      });
    });
  });
});
