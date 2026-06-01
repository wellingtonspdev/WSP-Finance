import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VerificationService } from '../../src/services/VerificationService';
import { UserRepository } from '../../src/repositories/UserRepository';
import { EtherealMailProvider } from '../../src/providers/EtherealMailProvider';

vi.mock('../../src/repositories/UserRepository');
vi.mock('../../src/providers/EtherealMailProvider');

describe('VerificationService', () => {
  let service: VerificationService;
  let userRepositoryMock: any;
  let mailProviderMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VerificationService();
    // Accessing private members for mocking in tests if necessary,
    // or relying on the constructor injection (which we mocked above)
    userRepositoryMock = vi.mocked(UserRepository).prototype;
    mailProviderMock = vi.mocked(EtherealMailProvider).prototype;
  });

  it('should generate a 6-digit code and send an email', async () => {
    const userId = 1;
    const email = 'test@example.com';
    const name = 'Test User';

    await service.sendVerificationCode(userId, email, name);

    expect(userRepositoryMock.createVerificationToken).toHaveBeenCalledWith(
      userId,
      expect.stringMatching(/^\d{6}$/),
      expect.any(Date)
    );

    expect(mailProviderMock.sendMail).toHaveBeenCalledWith(
      email,
      expect.any(String),
      expect.stringContaining('Test User')
    );
  });

  it('should verify an account successfully with a valid token', async () => {
    const email = 'test@example.com';
    const code = '123456';
    const user = { id: 1, email, emailVerifiedAt: null };
    const validToken = { id: 10, userId: 1, code };

    userRepositoryMock.findByEmail.mockResolvedValue(user);
    userRepositoryMock.findValidVerificationToken.mockResolvedValue(validToken);

    await service.verifyAccount(email, code);

    expect(userRepositoryMock.markEmailAsVerified).toHaveBeenCalledWith(user.id);
    expect(userRepositoryMock.deleteVerificationToken).toHaveBeenCalledWith(validToken.id);
  });

  it('should throw an error if user is not found during verification', async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);

    await expect(service.verifyAccount('nonexistent@example.com', '123456'))
      .rejects.toThrow('User not found');
  });

  it('should throw an error if token is invalid or expired', async () => {
    const email = 'test@example.com';
    const code = 'invalid';
    const user = { id: 1, email, emailVerifiedAt: null };

    userRepositoryMock.findByEmail.mockResolvedValue(user);
    userRepositoryMock.findValidVerificationToken.mockResolvedValue(null);

    await expect(service.verifyAccount(email, code))
      .rejects.toThrow('Invalid or expired token');
  });
});
