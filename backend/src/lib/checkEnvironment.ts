import { PrismaClient } from '@prisma/client';

export const checkPrivileges = async (prismaClient: PrismaClient): Promise<void> => {
     const roleCheck: any[] = await prismaClient.$queryRaw`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    
     if (roleCheck && roleCheck[0]) {
       const { rolsuper, rolbypassrls } = roleCheck[0];
       if (rolsuper === true || rolbypassrls === true) {
         throw new Error('As roles logadas possuem bypassrls ou rolsuper (Privilégios excessivos)');
       }
     }
}
