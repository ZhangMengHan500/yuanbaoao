// Web stub for react-native-image-picker
// Uses browser file input API

export type MediaType = 'photo' | 'video' | 'mixed';

export interface ImagePickerResponse {
  didCancel: boolean;
  errorCode?: string;
  errorMessage?: string;
  assets?: Array<{
    uri: string;
    type?: string;
    fileName?: string;
    fileSize?: number;
    width?: number;
    height?: number;
  }>;
}

interface Options {
  mediaType?: MediaType;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  includeBase64?: boolean;
}

function openFilePicker(options: Options = {}): Promise<ImagePickerResponse> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.mediaType === 'video' ? 'video/*' : 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) {
        resolve({didCancel: true});
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          didCancel: false,
          assets: [{
            uri: reader.result as string,
            type: file.type,
            fileName: file.name,
            fileSize: file.size,
          }],
        });
      };
      reader.readAsDataURL(file);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve({didCancel: true});
    };

    input.click();
  });
}

export const launchImageLibrary = async (options: Options = {}): Promise<ImagePickerResponse> => {
  return openFilePicker({...options, mediaType: options.mediaType || 'photo'});
};

export const launchCamera = async (options: Options = {}): Promise<ImagePickerResponse> => {
  // Web doesn't have direct camera access; fall back to file picker
  return openFilePicker({...options, mediaType: options.mediaType || 'photo'});
};
