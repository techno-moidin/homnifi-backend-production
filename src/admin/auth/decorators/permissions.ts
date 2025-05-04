import { PERMISSION } from '@/src/enums/permission';

import { applyDecorators, SetMetadata } from '@nestjs/common';

export const Permissions = (permissions: PERMISSION[]) => {
  return applyDecorators(
    SetMetadata('permission-check', true),
    SetMetadata('permissions', permissions),
  );
};
