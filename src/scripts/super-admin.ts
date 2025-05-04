import { AdminService } from '../admin/admin.service';
import ScriptApp from './script-app';

export default class SuperAdminSeeder extends ScriptApp {
  protected async start(): Promise<void> {
    await super.start();
    await this.app.get(AdminService).createSuperAdmin();
  }
}

new SuperAdminSeeder()