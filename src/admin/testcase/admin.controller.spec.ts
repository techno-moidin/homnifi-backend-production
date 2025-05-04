// import { Test, TestingModule } from '@nestjs/testing';
// import { NotFoundException } from '@nestjs/common';
// import { Types, Document } from 'mongoose';
// import { AdminController } from '../admin.controller';
// import { AdminService } from '../admin.service';
// import { AppRequest } from '@/src/utils/app-request';
// import { AdminI } from '../auth/admin.interface';
// import { AdminGuard } from '../auth/guards/admin.guard';

// describe('AdminController', () => {
//   let adminController: AdminController;
//   let adminService: AdminService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [AdminController],
//       providers: [
//         {
//           provide: AdminService,
//           useValue: {
//             getAdminById: jest.fn(),
//           },
//         },
//         // {
//         //   provide: AdminGuard, // Mock the AdminGuard
//         //   useValue: { canActivate: jest.fn(() => true) },
//         // },
//       ],
//     })
//       // .overrideGuard(AdminGuard) // Override the guard with the mock
//       // .useValue({ canActivate: jest.fn(() => true) }) // Always return true for testing
//       .compile();

//     adminController = module.get<AdminController>(AdminController);
//     adminService = module.get<AdminService>(AdminService);
//   });

//   describe('getAdminById', () => {
//     it('should return formatted admin data when found', async () => {
//       const mockAdmin = {
//         _id: new Types.ObjectId('66a37811b222ffd90f1fb850'),
//         email: 'admin@softbuilders.com',
//         firstName: 'Supers',
//         lastName: 'Admins',
//         password:
//           '$2a$10$.aTuV5QCdqTAunW954euS.Vvpgq6c3Eo319b4jm3n.5M6BGDA3F9G',
//         isSuperAdmin: true,
//         status: 'active',
//         role: new Types.ObjectId('66a37811b222ffd90f1fb849'),
//         deletedAt: null,
//         createdAt: new Date('2024-07-26T10:18:57.364Z'),
//         updatedAt: new Date('2024-10-22T07:14:57.816Z'),
//         username: 'admin',
//         __v: 0,
//         passwordChangedAt: new Date('2024-10-08T11:03:11.031Z'),
//         TFASecret: 'IFRQVCTODJUR4RTF',
//         is2faEnabled: true,
//       } as unknown as Document<unknown, Record<string, never>, AdminI> &
//         AdminI &
//         Required<{ _id: Types.ObjectId }>;

//       jest.spyOn(adminService, 'getAdminById').mockResolvedValue({
//         message: 'Admin returned successfully!',
//         user: mockAdmin,
//       });

//       const mockRequest = {
//         admin: mockAdmin,
//       } as unknown as AppRequest;

//       const result = await adminController.getAdminById('1', mockRequest);

//       const formattedData = (result as any).formattedData();

//       expect(formattedData).toEqual({
//         status: true,
//         message: 'Admin returned successfully!',
//         data: {
//           message: 'Admin returned successfully!',
//           user: mockAdmin,
//         },
//       });
//       expect(adminService.getAdminById).toHaveBeenCalledWith('1');
//     });

//     it('should throw NotFoundException when admin is not found', async () => {
//       jest
//         .spyOn(adminService, 'getAdminById')
//         .mockRejectedValue(new NotFoundException('Admin not found'));

//       const mockRequest = { admin: {} } as AppRequest;

//       await expect(
//         adminController.getAdminById('999', mockRequest),
//       ).rejects.toThrow(NotFoundException);
//       expect(adminService.getAdminById).toHaveBeenCalledWith('999');
//     });
//   });
// });
