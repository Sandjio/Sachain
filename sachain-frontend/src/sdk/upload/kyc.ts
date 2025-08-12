// KYC Document Upload Helpers

import { UploadRequest, UploadResponse, ApiResponse } from '../types/api';

export interface FileUploadOptions {
  file: File;
  documentType: 'passport' | 'driver_license' | 'national_id' | 'utility_bill';
  onProgress?: (progress: number) => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class KYCUploader {
  private apiBaseUrl: string;
  private getAuthToken: () => Promise<string | null>;

  constructor(apiBaseUrl: string, getAuthToken: () => Promise<string | null>) {
    this.apiBaseUrl = apiBaseUrl;
    this.getAuthToken = getAuthToken;
  }

  validateFile(file: File): ValidationResult {
    const errors: string[] = [];

    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push('File type not supported. Please upload JPEG, PNG, or PDF files.');
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push('File size exceeds 10MB limit.');
    }

    if (file.size === 0) {
      errors.push('File is empty.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async uploadDocument(options: FileUploadOptions): Promise<ApiResponse<UploadResponse>> {
    const { file, documentType, onProgress } = options;

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'Authentication required',
        };
      }

      // Get presigned URL
      const uploadRequest: UploadRequest = {
        documentType,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      };

      const presignedResponse = await fetch(`${this.apiBaseUrl}/kyc/upload/presigned`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(uploadRequest),
      });

      if (!presignedResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { data: uploadData } = await presignedResponse.json() as ApiResponse<UploadResponse>;
      
      if (!uploadData?.uploadUrl) {
        throw new Error('No upload URL received');
      }

      // Upload file to S3
      await this.uploadToS3(uploadData.uploadUrl, file, onProgress);

      return {
        success: true,
        data: uploadData,
        message: 'Document uploaded successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  private async uploadToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async getDocuments(): Promise<ApiResponse<any[]>> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'Authentication required',
        };
      }

      const response = await fetch(`${this.apiBaseUrl}/kyc/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch documents',
      };
    }
  }
}