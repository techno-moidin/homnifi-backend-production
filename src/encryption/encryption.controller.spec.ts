import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionController } from './encryption.controller';
import { EncryptionService } from './encryption.service';

describe('EncryptionController', () => {
  let controller: EncryptionController;
  let service: EncryptionService;

  beforeEach(async () => {
    const mockEncryptionService = {
      encrypt: jest.fn(),
      decryptData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EncryptionController],
      providers: [
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    controller = module.get<EncryptionController>(EncryptionController);
    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('encryptData', () => {
    it('should return encrypted data for valid input', () => {
      const body = { field1: 'value1', field2: 'value2' };
      const isAdmin = true;
      jest
        .spyOn(service, 'encrypt')
        .mockImplementation((value) => `encrypted_${value}`);

      const result = controller.encryptData(body, isAdmin);

      expect(service.encrypt).toHaveBeenCalledTimes(2);
      expect(service.encrypt).toHaveBeenCalledWith('value1', isAdmin);
      expect(service.encrypt).toHaveBeenCalledWith('value2', isAdmin);
      expect(result).toEqual({
        message: 'Encryption successful',
        encryptedData: {
          field1: 'encrypted_value1',
          field2: 'encrypted_value2',
        },
      });
    });

    it('should return error message for non-string values', () => {
      const body = { field1: 123, field2: true };
      const result = controller.encryptData(body);

      expect(result).toEqual({
        message: 'Encryption successful',
        encryptedData: {
          field1: 'Invalid field type, only strings are supported',
          field2: 'Invalid field type, only strings are supported',
        },
      });
    });

    it('should return validation message for empty input', () => {
      const body = {};
      const result = controller.encryptData(body);

      expect(result).toEqual({
        message: 'At least one field is required for encryption',
      });
    });
  });

  describe('decryptData', () => {
    it('should return decrypted data for valid input', () => {
      const body: Record<string, string> = {
        field1: 'encrypted_value1',
        field2: 'encrypted_value2',
      };
      const isAdmin = false;
      jest
        .spyOn(service, 'decryptData')
        .mockImplementation((value) => value.replace('encrypted_', ''));

      const result = controller.decryptData(body, isAdmin);

      expect(service.decryptData).toHaveBeenCalledTimes(2);
      expect(service.decryptData).toHaveBeenCalledWith(
        'encrypted_value1',
        isAdmin,
      );
      expect(service.decryptData).toHaveBeenCalledWith(
        'encrypted_value2',
        isAdmin,
      );
      expect(result).toEqual({
        message: 'Decryption successful',
        decryptedData: {
          field1: 'value1',
          field2: 'value2',
        },
      });
    });

    it('should return error message for non-string values', () => {
      const body: Record<string, any> = { field1: 123, field2: true };
      const result = controller.decryptData(body);

      expect(result).toEqual({
        message: 'Decryption successful',
        decryptedData: {
          field1: 'Invalid field type, only strings are supported',
          field2: 'Invalid field type, only strings are supported',
        },
      });
    });

    it('should return validation message for empty input', () => {
      const body: Record<string, any> = {};
      const result = controller.decryptData(body);

      expect(result).toEqual({
        message: 'At least one encrypted field is required for decryption',
      });
    });

    it('should handle decryption errors gracefully', () => {
      const body: Record<string, string> = {
        field1: 'invalid_encrypted_value',
      };
      jest.spyOn(service, 'decryptData').mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = controller.decryptData(body);

      expect(service.decryptData).toHaveBeenCalledWith(
        'invalid_encrypted_value',
        undefined,
      );
      expect(result).toEqual({
        message: 'Decryption successful',
        decryptedData: {
          field1: 'Decryption failed: Decryption failed',
        },
      });
    });
  });
});
