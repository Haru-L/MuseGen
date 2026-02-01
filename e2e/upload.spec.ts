import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.beforeEach(async ({ page }) => {
  // Debug console logs
  page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[Browser Error] ${err.message}`));

  // Mock AudioContext to avoid real decoding and control duration
  await page.addInitScript(() => {
    // Create a mock AudioBuffer class
    class MockAudioBuffer {
      duration: number;
      length: number;
      sampleRate: number;
      numberOfChannels: number;

      constructor(options: any) {
        this.duration = options.duration || 180;
        this.length = options.length || 44100 * 180;
        this.sampleRate = options.sampleRate || 44100;
        this.numberOfChannels = options.numberOfChannels || 2;
      }

      getChannelData() {
        return new Float32Array(this.length);
      }
    }

    const AudioContextMock = class {
      state = 'running';
      sampleRate = 44100;
      
      // Allow static duration to be set from outside if needed (via window)
      // But for now, we'll hardcode or use a global variable we can set
      
      async decodeAudioData(buffer: ArrayBuffer) {
        // Check if we requested a long duration via some global flag
        const isLong = (window as any).__MOCK_LONG_DURATION__;
        const duration = isLong ? 601 : 180;

        console.log(`[Mock] decodeAudioData called. Returning duration: ${duration}`);

        return new MockAudioBuffer({
          duration,
          length: 44100 * duration,
          sampleRate: 44100,
          numberOfChannels: 2
        });
      }
      
      createBufferSource() { return {}; }
      createGain() { return {}; }
      close() { return Promise.resolve(); }
    };

    // Override both standard and webkit prefix
    (window as any).AudioContext = AudioContextMock;
    (window as any).webkitAudioContext = AudioContextMock;
  });

  await page.goto('/');
});

test.describe('Audio Upload', () => {
  test('should upload a valid MP3 file successfully', async ({ page }) => {
    // Create a small dummy buffer
    const buffer = Buffer.from('ID3 dummy content');

    // Select file
    await page.setInputFiles('input[type="file"]', {
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer
    });

    // Should show success state (metadata editor)
    // Wait for the title "音频信息" to appear
    await expect(page.getByText('音频信息')).toBeVisible({ timeout: 10000 });
    
    // Verify filename is displayed (without extension)
    await expect(page.getByText('test', { exact: true })).toBeVisible();
  });

  test('should show error for invalid file type', async ({ page }) => {
    const buffer = Buffer.from('text content');
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer
    });

    // Expect error message
    await expect(page.getByText('仅支持 MP3 或 WAV 音频文件')).toBeVisible();
  });

  test('should show error for file too large', async ({ page }) => {
    // Create a large sparse file
    const largeFilePath = path.join(__dirname, 'large.mp3');
    const fd = fs.openSync(largeFilePath, 'w');
    // Write a byte at 51MB position to create a sparse file
    fs.writeSync(fd, Buffer.from([0]), 0, 1, 51 * 1024 * 1024);
    fs.closeSync(fd);

    try {
      await page.setInputFiles('input[type="file"]', largeFilePath);
      // Expect error message
      await expect(page.getByText('文件过大（超过 50MB）')).toBeVisible();
    } finally {
      // Cleanup
      if (fs.existsSync(largeFilePath)) {
        fs.unlinkSync(largeFilePath);
      }
    }
  });

  test('should show error for duration > 10 mins', async ({ page }) => {
    // Set flag for long duration
    await page.evaluate(() => {
      (window as any).__MOCK_LONG_DURATION__ = true;
    });

    const buffer = Buffer.from('dummy mp3 content');

    await page.setInputFiles('input[type="file"]', {
      name: 'long.mp3',
      mimeType: 'audio/mpeg',
      buffer
    });

    // Expect error message
    // "音频时长超过 10 分钟"
    await expect(page.getByText('音频时长超过 10 分钟')).toBeVisible({ timeout: 10000 });
  });

  test('should persist metadata updates', async ({ page }) => {
    const buffer = Buffer.from('dummy mp3 content');

    await page.setInputFiles('input[type="file"]', {
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer
    });
    
    // Wait for "音频信息" (success) or "暂无音频信息" (loading) or error
    // We expect success eventually
    await expect(page.getByText('音频信息')).toBeVisible({ timeout: 15000 });

    // Verify title is displayed (filename without extension)
    await expect(page.getByText('test', { exact: true })).toBeVisible();

    // Click edit button
    await page.getByTitle('编辑标题').click();

    // Input should be visible
    const input = page.getByPlaceholder('输入音频标题');
    await expect(input).toBeVisible();

    // Fill new title
    await input.fill('My New Song');
    
    // Click save (title="保存")
    await page.getByTitle('保存').click();

    // Verify new title is displayed
    await expect(page.getByText('My New Song')).toBeVisible();
    
    // Wait a bit for persistence to ensure IndexedDB transaction completes
    await page.waitForTimeout(1000);

    // Reload page to check persistence (from IndexedDB)
    await page.reload();

    // Verify data is recovered
    await expect(page.getByText('My New Song')).toBeVisible({ timeout: 10000 });
  });
});
