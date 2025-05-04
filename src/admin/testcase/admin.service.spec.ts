// import { Test, TestingModule } from '@nestjs/testing';
// import { getModelToken } from '@nestjs/mongoose';
// import { NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
// import { Model, Types } from 'mongoose';
// import { Admin } from '../schemas/admin.schema';
// import { AdminService } from '../admin.service';

// describe('AdminService', () => {
//   let adminService: AdminService;
//   let adminModel: Model<Admin>;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         AdminService,
//         {
//           provide: getModelToken('Admin'),
//           useValue: {
//             findById: jest.fn(),
//           },
//         },
//       ],
//     }).compile();

//     adminService = module.get<AdminService>(AdminService);
//     adminModel = module.get<Model<Admin>>(getModelToken('Admin'));
//   });

//   describe('getAdminById', () => {
//     it('should return formatted admin data when admin exists', async () => {
//       const mockAdmin = {
//         _id: new Types.ObjectId(),
//         email: 'admin@example.com',
//         username: 'admin_user',
//         firstName: 'Admin',
//         lastName: 'User',
//         password: 'hashedpassword',
//         isSuperAdmin: true,
//         status: 'ACTIVE',
//         role: null,
//         TFASecret: '',
//         is2faEnabled: false,
//         deletedAt: null,
//         passwordChangedAt: null,
//       } as unknown as Admin;

//       jest.spyOn(adminModel, 'findById').mockResolvedValue(mockAdmin);

//       const result = await adminService.getAdminById('1');

//       expect(result).toEqual({
//         message: 'Admin returned successfully!',
//         user: mockAdmin,
//       });
//       expect(adminModel.findById).toHaveBeenCalledWith('1');
//     });

//     it('should throw HttpException when admin is not found', async () => {
//       jest.spyOn(adminModel, 'findById').mockResolvedValue(null);

//       await expect(adminService.getAdminById('999')).rejects.toThrow(
//         new HttpException('Admin not found', HttpStatus.BAD_REQUEST),
//       );
//       expect(adminModel.findById).toHaveBeenCalledWith('999');
//     });
//   });
// });
