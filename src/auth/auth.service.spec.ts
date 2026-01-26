import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

const mockUsersService = () => ({
  findByEmail: jest.fn(),
  create: jest.fn(),
  setRefreshToken: jest.fn(),
  findById: jest.fn(),
});

const mockJwtService = () => ({
  signAsync: jest.fn().mockResolvedValue('token'),
  verify: jest.fn(),
  verifyAsync: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'email.enabled') return false;
    if (key === 'port') return 3001;
    return 'secret';
  }),
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UsersService', useFactory: mockUsersService },
        { provide: 'JwtService', useFactory: mockJwtService },
        { provide: 'ConfigService', useFactory: mockConfigService },
        { provide: 'EmailService', useValue: { sendMail: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get('UsersService');
    jwtService = module.get('JwtService');
  });

  it('registers a new user', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({ _id: '1', email: 'a@b.com' });

    const res = await service.register('a@b.com', 'password123');
    expect(usersService.create).toHaveBeenCalled();
    expect(res).toHaveProperty('id');
  });

  it('throws on duplicate registration', async () => {
    usersService.findByEmail.mockResolvedValue({ _id: '1', email: 'a@b.com' });
    await expect(service.register('a@b.com', 'p')).rejects.toThrow();
  });

  it('logs in and returns tokens', async () => {
    const user = { _id: '1', email: 'a@b.com', password: '$2b$10$saltsamples' };
    // bcrypt.compare will be called inside validateUser -> we can stub validateUser directly
    jest.spyOn(service as any, 'validateUser').mockResolvedValue(user);
    const out = await service.login(user as any);
    expect(out).toHaveProperty('accessToken');
    expect(out).toHaveProperty('refreshToken');
  });
});
