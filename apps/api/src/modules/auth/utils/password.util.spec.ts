import { PasswordUtil } from './password.util';

describe('PasswordUtil', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = await PasswordUtil.hashPassword(plainPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should throw error for empty password', async () => {
      await expect(PasswordUtil.hashPassword('')).rejects.toThrow('Password cannot be empty');
      await expect(PasswordUtil.hashPassword('   ')).rejects.toThrow('Password cannot be empty');
    });

    it('should generate different hashes for same password', async () => {
      const plainPassword = 'testPassword123!';
      const hash1 = await PasswordUtil.hashPassword(plainPassword);
      const hash2 = await PasswordUtil.hashPassword(plainPassword);
      
      expect(hash1).not.toBe(hash2); // Different salts should create different hashes
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const plainPassword = 'testPassword123!';
      const hashedPassword = await PasswordUtil.hashPassword(plainPassword);
      
      const isValid = await PasswordUtil.verifyPassword(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const plainPassword = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hashedPassword = await PasswordUtil.hashPassword(plainPassword);
      
      const isValid = await PasswordUtil.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should return false for empty inputs', async () => {
      const hashedPassword = await PasswordUtil.hashPassword('test123!');
      
      expect(await PasswordUtil.verifyPassword('', hashedPassword)).toBe(false);
      expect(await PasswordUtil.verifyPassword('test123!', '')).toBe(false);
      expect(await PasswordUtil.verifyPassword('', '')).toBe(false);
    });
  });

  describe('needsRehashing', () => {
    it('should return false for correctly hashed password', async () => {
      const hashedPassword = await PasswordUtil.hashPassword('test123!');
      const needsRehash = PasswordUtil.needsRehashing(hashedPassword);
      
      expect(needsRehash).toBe(false);
    });

    it('should return true for invalid hash format', () => {
      const invalidHash = 'not-a-valid-bcrypt-hash';
      const needsRehash = PasswordUtil.needsRehashing(invalidHash);
      
      expect(needsRehash).toBe(true);
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password of correct length', () => {
      const password = PasswordUtil.generateRandomPassword(16);
      expect(password).toHaveLength(16);
    });

    it('should generate different passwords each time', () => {
      const password1 = PasswordUtil.generateRandomPassword();
      const password2 = PasswordUtil.generateRandomPassword();
      
      expect(password1).not.toBe(password2);
    });

    it('should use default length of 12', () => {
      const password = PasswordUtil.generateRandomPassword();
      expect(password).toHaveLength(12);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = PasswordUtil.validatePasswordStrength('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        { password: '', expectedErrors: ['Password is required'] },
        { password: '123', expectedErrors: ['Password must be at least 8 characters long'] },
        { password: 'lowercase', expectedErrors: ['Password must contain at least one uppercase letter'] },
        { password: 'UPPERCASE', expectedErrors: ['Password must contain at least one lowercase letter'] },
        { password: 'NoNumbers!', expectedErrors: ['Password must contain at least one number'] },
        { password: 'NoSpecial123', expectedErrors: ['Password must contain at least one special character'] },
      ];

      weakPasswords.forEach(({ password, expectedErrors }) => {
        const result = PasswordUtil.validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expectedErrors.forEach(error => {
          expect(result.errors).toContain(error);
        });
      });
    });
  });
});
