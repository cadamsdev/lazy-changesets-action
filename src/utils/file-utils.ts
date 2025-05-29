import { unlinkSync } from 'fs';

export function deleteFiles(filePaths: string[]): void {
  filePaths.forEach((filePath) => {
    console.log(`Deleting file: ${filePath}`);
    unlinkSync(filePath);
  });
}

export function getDirectoryPath(filePath: string): string {
  let result = '';
  const lastSlashIndex = filePath.lastIndexOf('/');
  if (lastSlashIndex !== -1) {
    result = filePath.substring(0, lastSlashIndex);
  }

  if (!result) {
    result = './';
  }

  return result;
}
