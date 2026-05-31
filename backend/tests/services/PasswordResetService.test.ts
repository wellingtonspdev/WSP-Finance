import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PasswordResetService } from '../../src/services/PasswordResetService';
import { UserRepository } from '../../src/repositories/UserRepository';
import { EtherealMailProvider } from '../../src/providers/EtherealMailProvider';

vi.mock('../../src/repositories/UserRepository');
vi.mock('../../src/providers/EtherealMailProvider');

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let userRepositoryMock: any;
  let mailProviderMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PasswordResetService();
    userRepositoryMock = vi.mocked(UserRepository).prototype;
    mailProviderMock = vi.mocked(EtherealMailProvider).prototype;
  });

  it('should generate a 6-digit reset code and send an email', async () => {
    const user = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    userRepositoryMock.findByEmail.mockResolvedValue(user);

    await service.executeForgotPassword(user.email);

    expect(userRepositoryMock.createPasswordResetToken).toHaveBeenCalledWith(
      user.id,
      expect.stringMatching(/^\d{6}$/),
      expect.any(Date)
    );
    expect(mailProviderMock.sendMail).toHaveBeenCalledWith(
      user.email,
      expect.any(String),
      expect.stringContaining('Test User')
    );
  });
});
