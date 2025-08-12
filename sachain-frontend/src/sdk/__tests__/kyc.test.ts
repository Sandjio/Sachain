// Unit tests for KYC upload helpers

import { KYCUploader, FileUploadOptions } from '../upload/kyc';

// Mock fetch
global.fetch = jest.fn();

// Mock XMLHttpRequest
const mockXHR = {
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  upload: {
    addEventListener: jest.fn(),
  },
  addEventListener: jest.fn(),
  status: 200,
};

(global as any).XMLHttpRequest = jest.fn(() => mockXHR);

describe('KYCUploader', () => {
  let uploader: KYCUploader;
  const mockGetAuthToken = jest.fn();

  beforeEach(() => {
    uploader = new KYCUploader('https://api.example.com', mockGetAuthToken);
    jest.clearAllMocks();
    mockGetAuthToken.mockResolvedValue('mock-token');
  });

  describe('validateFile', () => {
    it('should validate file successfully', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = uploader.validateFile(file);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported file type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = uploader.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type not supported. Please upload JPEG, PNG, or PDF files.');
    });

    it('should reject oversized file', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      const result = uploader.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size exceeds 10MB limit.');
    });

    it('should reject empty file', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 0 });

      const result = uploader.validateFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty.');
    });
  });

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const options: FileUploadOptions = {
        file,
        documentType: 'national_id',
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            documentId: 'doc-123',
            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
            message: 'Upload URL generated',
          },
        }),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Mock successful S3 upload
      mockXHR.addEventListener.mockImplementation((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 0);
        }
      });

      const result = await uploader.uploadDocument(options);

      expect(result.success).toBe(true);
      expect(result.data?.documentId).toBe('doc-123');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/kyc/upload/presigned',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });

    it('should handle invalid file', async () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 0 });

      const options: FileUploadOptions = {
        file,
        documentType: 'national_id',
      };

      const result = await uploader.uploadDocument(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File type not supported');
    });

    it('should handle authentication error', async () => {
      mockGetAuthToken.mockResolvedValue(null);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const options: FileUploadOptions = {
        file,
        documentType: 'national_id',
      };

      const result = await uploader.uploadDocument(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });

    it('should handle API error', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const options: FileUploadOptions = {
        file,
        documentType: 'national_id',
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      });

      const result = await uploader.uploadDocument(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get upload URL');
    });
  });

  describe('getDocuments', () => {
    it('should fetch documents successfully', async () => {
      const mockDocuments = [
        { documentId: 'doc-1', status: 'approved' },
        { documentId: 'doc-2', status: 'pending' },
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockDocuments,
        }),
      });

      const result = await uploader.getDocuments();

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/kyc/documents',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });

    it('should handle authentication error', async () => {
      mockGetAuthToken.mockResolvedValue(null);

      const result = await uploader.getDocuments();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication required');
    });
  });
});