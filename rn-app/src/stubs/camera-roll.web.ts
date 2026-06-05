// Web stub for @react-native-camera-roll/camera-roll

export const CameraRoll = {
  save: async (tag: string, options?: any): Promise<string> => {
    console.warn('CameraRoll.save not supported on web');
    return '';
  },
  getPhotos: async (params: any): Promise<{edges: any[]; page_info: any}> => {
    return {edges: [], page_info: {has_next_page: false}};
  },
  deletePhotos: async (urls: string[]): Promise<void> => {},
};
