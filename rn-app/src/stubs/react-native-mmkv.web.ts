// Web stub for react-native-mmkv — uses browser localStorage
class MMKVStorage {
  private prefix: string;

  constructor(config?: {id?: string}) {
    this.prefix = config?.id ? `mmkv_${config.id}_` : 'mmkv_';
  }

  private key(name: string): string {
    return `${this.prefix}${name}`;
  }

  getString(name: string): string | undefined {
    const val = localStorage.getItem(this.key(name));
    return val !== null ? val : undefined;
  }

  set(name: string, value: string | number | boolean): void {
    localStorage.setItem(this.key(name), String(value));
  }

  getNumber(name: string): number | undefined {
    const val = localStorage.getItem(this.key(name));
    if (val === null) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }

  getBoolean(name: string): boolean | undefined {
    const val = localStorage.getItem(this.key(name));
    if (val === null) return undefined;
    return val === 'true';
  }

  contains(name: string): boolean {
    return localStorage.getItem(this.key(name)) !== null;
  }

  delete(name: string): void {
    localStorage.removeItem(this.key(name));
  }

  clearAll(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }
}

export {MMKVStorage as MMKV};
export default MMKVStorage;
