import { Test, TestingModule } from '@nestjs/testing';
import { GatewayService } from './gateway.service';
import { Server, Socket } from 'socket.io';
import { EmitMessageDto } from './dtos/emitMessageDto';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GatewayService', () => {
  let service: GatewayService;
  let mockServer: Server;

  beforeEach(async () => {
    mockServer = {
      emit: jest.fn(),
      on: jest.fn(),
    } as unknown as Server;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GatewayService],
    })
      .overrideProvider(GatewayService)
      .useValue({
        server: mockServer,
        onlineUsers: 0,
        handleConnection: GatewayService.prototype.handleConnection,
        handleDisconnect: GatewayService.prototype.handleDisconnect,
        onNewMessage: GatewayService.prototype.onNewMessage,
        emitSocketEventNotification:
          GatewayService.prototype.emitSocketEventNotification,
        getOnlineUsersCount: GatewayService.prototype.getOnlineUsersCount,
      })
      .compile();

    service = module.get<GatewayService>(GatewayService);
    service.server = mockServer;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should increase online users count and emit the new count', () => {
      const mockClient = { id: 'test-client-id' } as unknown as Socket;

      service.handleConnection(mockClient);

      expect(service.getOnlineUsersCount()).toBe(1);
      expect(mockServer.emit).toHaveBeenCalledWith('onlineUsers', 1);
    });
  });

  describe('handleDisconnect', () => {
    it('should decrease online users count and emit the new count', () => {
      const mockClient = { id: 'test-client-id' } as unknown as Socket;

      service.handleConnection(mockClient);
      service.handleDisconnect(mockClient);

      expect(service.getOnlineUsersCount()).toBe(0);
      expect(mockServer.emit).toHaveBeenCalledWith('onlineUsers', 0);
    });
  });

  describe('onNewMessage', () => {
    it('should respond with a Pong message', () => {
      const messageBody = { msg: 'Ping test message' };

      service.onNewMessage(messageBody);

      expect(mockServer.emit).toHaveBeenCalledWith('Pong', {
        msg: 'Ping',
        Body: {
          Message: 'Lets start Both end connected',
        },
      });
    });
  });

  describe('emitSocketEventNotification', () => {
    it('should emit a custom event with the provided data', async () => {
      const mockRequest: EmitMessageDto = {
        message: 'Test message',
        eventName: 'TEST_EVENT',
        data: { key: 'value' },
      };

      const result = await service.emitSocketEventNotification(mockRequest);

      expect(mockServer.emit).toHaveBeenCalledWith('TEST_EVENT', {
        message: 'Test message',
        body: { key: 'value' },
      });
      expect(result).toBe('Sent Successfully');
    });

    it('should throw HttpException when an error occurs during event emission', async () => {
      const mockRequest: EmitMessageDto = {
        message: 'Test message',
        eventName: 'TEST_EVENT',
        data: { key: 'value' },
      };

      jest.spyOn(mockServer, 'emit').mockImplementation(() => {
        throw new Error('Emit error');
      });

      await expect(
        service.emitSocketEventNotification(mockRequest),
      ).rejects.toThrow(HttpException);
      await expect(
        service.emitSocketEventNotification(mockRequest),
      ).rejects.toThrow('Internal error Error: Emit error ');
    });
  });

  describe('getOnlineUsersCount', () => {
    it('should return the current number of online users', () => {
      expect(service.getOnlineUsersCount()).toBe(0);
      service.handleConnection({} as Socket);
      expect(service.getOnlineUsersCount()).toBe(1);
    });
  });
});
