import * as bcrypt from 'bcrypt';

/**
 * Password utility functions for secure hashing and verification
 * Uses bcrypt with cost factor 10 for optimal security/performance balance
 */
export class PasswordUtil {
  // Cost factor 10 provides good security while maintaining reasonable performance
  private static readonly SALT_ROUNDS = 10;

  /**
   * Hash a plain text password using bcrypt
   * @param plainPassword - The plain text password to hash
   * @returns Promise resolving to the hashed password
   * @throws Error if hashing fails
   */
  static async hashPassword(plainPassword: string): Promise<string> {
    try {
      if (!plainPassword || plainPassword.trim() === '') {
        throw new Error('Password cannot be empty');
      }

      // Generate salt and hash the password
      const hashedPassword = await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
      return hashedPassword;
    } catch (error) {
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  /**
   * Verify a plain text password against a hashed password
   * @param plainPassword - The plain text password to verify
   * @param hashedPassword - The hashed password to compare against
   * @returns Promise resolving to true if passwords match, false otherwise
   * @throws Error if verification fails
   */
  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      if (!plainPassword || !hashedPassword) {
        return false;
      }

      // Compare the plain password with the hashed password
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      return isMatch;
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }

  /**
   * Check if a password needs rehashing (e.g., if cost factor has changed)
   * @param hashedPassword - The hashed password to check
   * @returns true if password needs rehashing, false otherwise
   */
  static needsRehashing(hashedPassword: string): boolean {
    try {
      // Extract the cost factor from the hashed password
      const costFactor = bcrypt.getRounds(hashedPassword);
      return costFactor !== this.SALT_ROUNDS;
    } catch (error) {
      // If we can't determine the cost factor, assume it needs rehashing
      return true;
    }
  }

  /**
   * Generate a secure random password for testing or temporary passwords
   * @param length - Length of the password to generate (default: 12)
   * @returns A random password string
   */
  static generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Validate password strength
   * @param password - The password to validate
   * @returns Object with validation result and any errors
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
