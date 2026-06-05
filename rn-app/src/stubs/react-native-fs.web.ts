// Web stub for react-native-fs

const RNFS = {
  readFile: async (filePath: string, encoding?: string): Promise<string> => {
    const response = await fetch(filePath);
    if (encoding === 'base64') {
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.readAsDataURL(blob);
      });
    }
    return response.text();
  },
  writeFile: async (filePath: string, content: string, encoding?: string): Promise<void> => {
    console.warn('RNFS.writeFile not supported on web');
  },
  exists: async (filePath: string): Promise<boolean> => {
    try {
      const response = await fetch(filePath, {method: 'HEAD'});
      return response.ok;
    } catch {
      return false;
    }
  },
  mkdir: async (dirPath: string): Promise<void> => {},
  unlink: async (filePath: string): Promise<void> => {},
  readDir: async (dirPath: string): Promise<any[]> => [],
  downloadFile: (options: any) => ({
    promise: Promise.resolve({statusCode: 200}),
    stop: () => {},
  }),
  uploadFiles: (options: any) => ({
    promise: Promise.resolve({statusCode: 200, bodies: []}),
    stop: () => {},
  }),
  copyFile: async (src: string, dest: string): Promise<void> => {},
  moveFile: async (src: string, dest: string): Promise<void> => {},
  hash: async (filePath: string, algorithm: string): Promise<string> => '',
  getFSInfo: async () => ({totalSpace: 0, freeSpace: 0}),
  touch: async (filePath: string, ctime?: number, mtime?: number): Promise<void> => {},
  stat: async (filePath: string) => ({mtime: new Date(), ctime: new Date(), size: 0, isFile: () => true, isDirectory: () => false}),
  read: async (filePath: string, encoding?: string): Promise<string> => '',
  appendFile: async (filePath: string, content: string, encoding?: string): Promise<void> => {},
  write: async (filePath: string, content: string, encoding?: string): Promise<void> => {},
};

export default RNFS;
