import { IStorageProvider } from './IStorageProvider';
import { S3StorageProvider } from './S3StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';

export function getExportStorageProvider(): IStorageProvider {
  if (process.env.E2E_STORAGE_PROVIDER === 'local') {
    return new LocalStorageProvider();
  }
  return new S3StorageProvider();
}
