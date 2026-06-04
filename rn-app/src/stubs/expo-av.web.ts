/**
 * Web环境下的expo-av兼容层
 * 使用HTML5 Audio API替代expo-av
 */

class WebAudio {
  private audio: HTMLAudioElement | null = null;
  private statusCallback: ((status: any) => void) | null = null;
  private isLoaded = false;
  private position = 0;
  private duration = 0;

  static async createAsync(
    source: {uri: string},
    options?: {shouldPlay?: boolean}
  ): Promise<{sound: WebAudio}> {
    const sound = new WebAudio();
    await sound.loadAsync(source.uri);
    return {sound};
  }

  async loadAsync(uri: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.audio = new Audio(uri);

      this.audio.addEventListener('loadedmetadata', () => {
        this.isLoaded = true;
        this.duration = this.audio?.duration || 0;
        this.notifyStatus();
        resolve();
      });

      this.audio.addEventListener('timeupdate', () => {
        this.position = this.audio?.currentTime || 0;
        this.notifyStatus();
      });

      this.audio.addEventListener('ended', () => {
        this.position = 0;
        this.notifyStatus({didJustFinish: true});
      });

      this.audio.addEventListener('error', (e) => {
        reject(new Error('Failed to load audio'));
      });

      this.audio.load();
    });
  }

  setOnPlaybackStatusUpdate(callback: (status: any) => void): void {
    this.statusCallback = callback;
  }

  private notifyStatus(extra?: any): void {
    if (this.statusCallback) {
      this.statusCallback({
        isLoaded: this.isLoaded,
        positionMillis: this.position * 1000,
        durationMillis: this.duration * 1000,
        didJustFinish: false,
        ...extra,
      });
    }
  }

  async playAsync(): Promise<void> {
    if (this.audio) {
      await this.audio.play();
    }
  }

  async pauseAsync(): Promise<void> {
    if (this.audio) {
      this.audio.pause();
    }
  }

  async stopAsync(): Promise<void> {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.position = 0;
    }
  }

  async setPositionAsync(positionMs: number): Promise<void> {
    if (this.audio) {
      this.audio.currentTime = positionMs / 1000;
      this.position = positionMs / 1000;
    }
  }

  async unloadAsync(): Promise<void> {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
      this.isLoaded = false;
    }
  }
}

export const Audio = {
  Sound: WebAudio,
  setAudioModeAsync: async () => {},
};
