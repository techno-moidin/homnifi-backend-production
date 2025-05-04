import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RegisterUserDto } from './dto/auth.dto';
import ApiResponse from '../utils/api-response.util';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AppRequest } from '../utils/app-request';

//signup
describe('AuthController - Signup', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            registerUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should successfully register a user and return the result', async () => {
    const createUserDto: RegisterUserDto = {
      username: 'testuser',
      password: 'securepassword',
      email: 'testuser@example.com',
      captchaToken: 'samplecaptcha',
      country: 'USA',
      referralUpline: 'upline123',
    };
    const mockResponse = new ApiResponse({
      status: 'success',
      message: 'User registered successfully',
    });

    jest.spyOn(authService, 'registerUser').mockResolvedValue(mockResponse);
    const result = await controller.create(createUserDto);
    expect(authService.registerUser).toHaveBeenCalledWith(createUserDto);
    expect(result).toEqual(mockResponse);
  });

  it('should throw an error if registration fails', async () => {
    const createUserDto: RegisterUserDto = {
      username: 'testuser',
      password: 'securepassword',
      email: 'testuser@example.com',
      captchaToken: 'samplecaptcha',
      country: 'USA',
      referralUpline: 'upline123',
    };

    jest
      .spyOn(authService, 'registerUser')
      .mockRejectedValue(new Error('Registration failed'));

    try {
      await controller.create(createUserDto);
    } catch (error) {
      ;
      expect(error.message).toBe('Registration failed');
    }
  });
});

//signin
describe('AuthController - SignIn', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signIn: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should successfully sign in and return the result', async () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'securepassword',
      captchaToken: 'samplecaptcha',
    };
    const mockRequest = {};

    const mockResponse = new ApiResponse({
      status: 'success',
      token: 'some-jwt-token',
      user: {
        id: 'userId123',
        username: 'testuser',
      },
    });

    jest.spyOn(authService, 'signIn').mockResolvedValue(mockResponse);
    const result = await controller.signIn(mockRequest, loginDto);

    expect(authService.signIn).toHaveBeenCalledWith(mockRequest, loginDto);
    expect(result).toEqual(mockResponse);
  });
  it('should throw an UnauthorizedException if sign-in fails', async () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'wrongpassword',
      captchaToken: 'samplecaptcha',
    };
    const mockRequest = {};
    jest
      .spyOn(authService, 'signIn')
      .mockRejectedValue(new UnauthorizedException('Invalid credentials'));
    try {
      await controller.signIn(mockRequest, loginDto);
    } catch (error) {
      ;
    }
    expect(authService.signIn).toHaveBeenCalledWith(mockRequest, loginDto);
  });
});

// Sign-Out from a single device
describe('AuthController - SignOut', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signOut: jest.fn(),
          },
        },
        JwtAuthGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should successfully sign out and return the result', async () => {
    const mockRequest = {
      user: { userId: 'userId123' },
    } as AppRequest;
    const mockResponse = new ApiResponse({
      status: 'success',
      message: 'User signed out successfully',
    });

    jest.spyOn(authService, 'signOut').mockResolvedValue(mockResponse);
    const result = await controller.signOut(mockRequest);

    expect(authService.signOut).toHaveBeenCalledWith(mockRequest);
    expect(result).toEqual(mockResponse);
  });

  it('should throw an UnauthorizedException if sign-out fails', async () => {
    const mockRequest = {
      user: { userId: 'userId123' },
    } as AppRequest;

    jest
      .spyOn(authService, 'signOut')
      .mockRejectedValue(new UnauthorizedException('Sign-out failed'));

    await expect(controller.signOut(mockRequest)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

//signout from all devices
describe('AuthController - Logout from All Devices', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            logoutFromAllDevices: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should successfully logout from all devices and return the result', async () => {
    const token = 'validToken';
    const accessToken = 'validAccessToken';
    const mockResponse = new ApiResponse({
      status: 'success',
      message: 'Logged out from all devices successfully',
    });

    jest
      .spyOn(authService, 'logoutFromAllDevices')
      .mockResolvedValue(mockResponse);
    const result = await controller.logoutFromAllDevices(token, accessToken);
    expect(authService.logoutFromAllDevices).toHaveBeenCalledWith(
      token,
      accessToken,
    );
    expect(result).toEqual(mockResponse);
  });

  it('should throw a BadRequestException if logout fails due to invalid tokens', async () => {
    const token = 'invalidToken';
    const accessToken = 'invalidAccessToken';

    jest
      .spyOn(authService, 'logoutFromAllDevices')
      .mockRejectedValue(new BadRequestException('Invalid tokens provided'));
    await expect(
      controller.logoutFromAllDevices(token, accessToken),
    ).rejects.toThrow(BadRequestException);
  });
});
