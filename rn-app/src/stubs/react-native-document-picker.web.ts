// Web stub for react-native-document-picker

interface DocumentPickerResponse {
  uri: string;
  type: string;
  name: string;
  size: number;
}

class DocumentPicker {
  static async pick({type}: {type?: string[]} = {}): Promise<DocumentPickerResponse[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (type?.length) {
        input.accept = type.join(',');
      }
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = () => {
        const files = input.files;
        document.body.removeChild(input);
        if (!files || files.length === 0) {
          resolve([]);
          return;
        }
        const results: DocumentPickerResponse[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          results.push({
            uri: URL.createObjectURL(file),
            type: file.type,
            name: file.name,
            size: file.size,
          });
        }
        resolve(results);
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        resolve([]);
      };

      input.click();
    });
  }

  static async pickSingle(options?: {type?: string[]}): Promise<DocumentPickerResponse> {
    const results = await this.pick(options);
    return results[0];
  }

  static async cancelRequest() {}
}

export default DocumentPicker;
