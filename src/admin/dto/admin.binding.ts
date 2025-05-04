import moment from 'moment';
import { Admin } from '../schemas/admin.schema';
import { Role } from '../schemas/role.schema';

export class AdminBinding {
  private id: string;
  private email: string;
  private firstName: string;
  private lastName: string;
  private isSuperAdmin: boolean;
  private status: string;
  private role: Role | null | string;
  private deletedAt: string | null;
  private createdAt: string;
  private updatedAt: string;
  private username: string;
  private fullName: string;
  private isSubSuperAdmin: boolean;

  constructor(admin: Partial<Admin | any>) {
    this.id = admin.id;
    this.email = admin.email;
    this.firstName = admin.firstName;
    this.lastName = admin.lastName;
    this.isSuperAdmin = admin.isSuperAdmin;
    this.status = admin.status;
    this.role = admin.role;

    this.deletedAt = admin.deletedAt
      ? moment(admin.deletedAt).format('MMMM Do YYYY, h:mm:ss a')
      : null;
    this.createdAt = admin.createdAt
      ? moment(admin.createdAt).format('MMMM Do YYYY, h:mm:ss a')
      : null;
    this.updatedAt = admin.updatedAt
      ? moment(admin.updatedAt).format('MMMM Do YYYY, h:mm:ss a')
      : null;
    this.username = admin.username;
    this.fullName = admin.fullName;
    this.isSubSuperAdmin = admin.isSubSuperAdmin;
  }
}
