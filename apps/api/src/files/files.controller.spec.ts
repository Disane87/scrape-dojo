import { vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { FilesController } from './files.controller';

// Mock the fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

describe('FilesController', () => {
  let controller: FilesController;
  let mockRes: {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
    headersSent: boolean;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
    }).compile();

    controller = module.get<FilesController>(FilesController);

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      download: vi.fn(),
      headersSent: false,
    };

    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('downloadFile', () => {
    it('should return 404 if file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await controller.downloadFile('/some/path/file.txt', mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'File not found',
      });
    });

    it('should return 400 if path is a directory', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => false,
      } as any);

      await controller.downloadFile('/some/directory', mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Path is not a file',
      });
    });

    it('should call res.download for a valid file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
      } as any);

      const filePath = '/downloads/report.csv';
      await controller.downloadFile(filePath, mockRes as any);

      expect(mockRes.download).toHaveBeenCalledWith(
        expect.any(String),
        'report.csv',
        expect.any(Function),
      );
    });

    it('should resolve a relative path to absolute', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
      } as any);

      const relativePath = 'downloads/file.txt';
      await controller.downloadFile(relativePath, mockRes as any);

      const expectedAbsolute = path.resolve(process.cwd(), relativePath);
      expect(mockRes.download).toHaveBeenCalledWith(
        expectedAbsolute,
        'file.txt',
        expect.any(Function),
      );
    });

    it('should use absolute path as-is', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
      } as any);

      const absolutePath = '/data/downloads/file.txt';
      await controller.downloadFile(absolutePath, mockRes as any);

      expect(mockRes.download).toHaveBeenCalledWith(
        absolutePath,
        'file.txt',
        expect.any(Function),
      );
    });

    it('should handle download error callback', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
      } as any);

      mockRes.download.mockImplementation(
        (_path: string, _name: string, callback: (err?: Error) => void) => {
          callback(new Error('Stream error'));
        },
      );

      await controller.downloadFile('/some/file.txt', mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Stream error',
      });
    });

    it('should not send error response if headers already sent', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
      } as any);

      mockRes.headersSent = true;
      mockRes.download.mockImplementation(
        (_path: string, _name: string, callback: (err?: Error) => void) => {
          callback(new Error('Stream error'));
        },
      );

      await controller.downloadFile('/some/file.txt', mockRes as any);

      // status should not be called because headers were already sent
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
