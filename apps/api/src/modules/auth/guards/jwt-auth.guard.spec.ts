import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, IS_PUBLIC_KEY } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({
          method: 'GET',
          path: '/test',
          headers: {},
        })),
      })),
    } as unknown as ExecutionContext;

    it('should allow access to public endpoints', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should require authentication for protected endpoints', () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      
      // Mock the parent canActivate method
      const parentCanActivate = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      parentCanActivate.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);
    });

    it('should require authentication when no public metadata is set', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      
      const parentCanActivate = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      parentCanActivate.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);
    });
  });

  describe('handleRequest', () => {
    const mockExecutionContext = {
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({
          method: 'GET',
          path: '/test',
          headers: {
            'user-agent': 'test-agent',
          },
          ip: '192.168.1.1',
        })),
      })),
    } as unknown as ExecutionContext;

    it('should return user when authentication succeeds', () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      const result = guard.handleRequest(null, mockUser, null, mockExecutionContext);

      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when no user is provided', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.handleRequest(null, null, null, mockExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, null, mockExecutionContext))
        .toThrow('Authentication failed');

      expect(consoleWarnSpy).toHaveBeenCalledWith('JWT Authentication failed:', {
        endpoint: 'GET /test',
        error: 'Authentication failed',
        userAgent: 'test-agent',
        ip: '192.168.1.1',
        timestamp: expect.any(String),
      });

      consoleWarnSpy.mockRestore();
    });

    it('should throw UnauthorizedException with custom error message', () => {
      const error = new Error('Custom error message');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.handleRequest(error, null, null, mockExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(error, null, null, mockExecutionContext))
        .toThrow('Custom error message');

      consoleWarnSpy.mockRestore();
    });

    it('should handle TokenExpiredError with specific message', () => {
      const info = { name: 'TokenExpiredError' };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow('Access token has expired');

      consoleWarnSpy.mockRestore();
    });

    it('should handle JsonWebTokenError with specific message', () => {
      const info = { name: 'JsonWebTokenError' };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow('Invalid access token');

      consoleWarnSpy.mockRestore();
    });

    it('should handle NotBeforeError with specific message', () => {
      const info = { name: 'NotBeforeError' };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow('Access token not active yet');

      consoleWarnSpy.mockRestore();
    });

    it('should handle TokenRequiredError with specific message', () => {
      const info = { name: 'TokenRequiredError' };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow('Access token is required');

      consoleWarnSpy.mockRestore();
    });

    it('should handle AuthTokenMissingError with specific message', () => {
      const info = { name: 'AuthTokenMissingError' };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow('Access token is required');

      consoleWarnSpy.mockRestore();
    });

    it('should use info.message when available', () => {
      const info = { name: 'CustomError', message: 'Custom info message' };
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info, mockExecutionContext))
        .toThrow('Custom info message');

      consoleWarnSpy.mockRestore();
    });

    it('should log authentication failures with request details', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        guard.handleRequest(null, null, null, mockExecutionContext);
      } catch (e) {
        // Expected to throw
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith('JWT Authentication failed:', {
        endpoint: 'GET /test',
        error: 'Authentication failed',
        userAgent: 'test-agent',
        ip: '192.168.1.1',
        timestamp: expect.any(String),
      });

      consoleWarnSpy.mockRestore();
    });
  });
});
