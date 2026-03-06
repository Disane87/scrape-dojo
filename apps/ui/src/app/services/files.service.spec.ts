vi.mock('@angular/common/http', () => ({
  HttpClient: class {},
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { FilesService } from './files.service';

describe('FilesService', () => {
  let service: FilesService;
  let mockHttp: { post: ReturnType<typeof vi.fn> };

  // DOM mocks
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockLink: {
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
  };
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;

  // Save originals
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    mockHttp = {
      post: vi.fn(),
    };

    service = Object.create(FilesService.prototype);
    (service as any).http = mockHttp;
    (service as any).apiUrl = '/api/files';

    // Setup DOM mocks
    mockCreateObjectURL = vi
      .fn()
      .mockReturnValue('blob:http://localhost/fake-url');
    mockRevokeObjectURL = vi.fn();
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    mockCreateElement = vi.fn().mockReturnValue(mockLink);
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();

    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
    document.createElement = mockCreateElement;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    document.createElement = originalCreateElement;
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });

  describe('downloadFile', () => {
    it('should send a POST request to download endpoint', () => {
      const mockResponse = {
        headers: { get: vi.fn().mockReturnValue(null) },
        body: new Blob(['test content']),
      };
      mockHttp.post.mockReturnValue(of(mockResponse));

      service.downloadFile('path/to/file.txt');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/api/files/download',
        { path: 'path/to/file.txt' },
        { responseType: 'blob', observe: 'response' },
      );
    });

    it('should extract filename from Content-Disposition with quotes', () => {
      const mockResponse = {
        headers: {
          get: vi.fn().mockReturnValue('attachment; filename="report.pdf"'),
        },
        body: new Blob(['pdf content']),
      };
      mockHttp.post.mockReturnValue(of(mockResponse));

      service.downloadFile('some/path');

      expect(mockLink.download).toBe('report.pdf');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should extract filename from Content-Disposition with RFC 5987', () => {
      const mockResponse = {
        headers: {
          get: vi
            .fn()
            .mockReturnValue("attachment; filename*=UTF-8''encoded%20file.txt"),
        },
        body: new Blob(['content']),
      };
      mockHttp.post.mockReturnValue(of(mockResponse));

      service.downloadFile('some/path');

      expect(mockLink.download).toBe('encoded file.txt');
    });

    it('should fall back to path filename when no Content-Disposition', () => {
      const mockResponse = {
        headers: { get: vi.fn().mockReturnValue(null) },
        body: new Blob(['content']),
      };
      mockHttp.post.mockReturnValue(of(mockResponse));

      service.downloadFile('downloads/data.csv');

      expect(mockLink.download).toBe('data.csv');
    });

    it('should handle errors', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      if (!window.alert) window.alert = () => {};
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const error = new Error('Network error');
      mockHttp.post.mockReturnValue(throwError(() => error));

      service.downloadFile('path/to/file.txt');

      expect(consoleSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should not create blob URL when body is null', () => {
      const mockResponse = {
        headers: { get: vi.fn().mockReturnValue(null) },
        body: null,
      };
      mockHttp.post.mockReturnValue(of(mockResponse));

      service.downloadFile('path/to/file.txt');

      expect(mockCreateObjectURL).not.toHaveBeenCalled();
      expect(mockLink.click).not.toHaveBeenCalled();
    });
  });
});
