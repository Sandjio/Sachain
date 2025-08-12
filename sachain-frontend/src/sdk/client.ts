// Sachain API Client SDK for frontend integration

import {
  ApiConfig,
  CognitoConfig,
  UserSession,
  PresignedUrlRequest,
  DirectUploadRequest,
  UploadProcessingRequest,
  UploadResponse,
  AdminReviewRequest,
  AdminReviewResponse,
  GetDocumentsRequest,
  GetDocumentsResponse,
  KYCDocument,
  UserProfile,
  ApiError,
  FileValidationResult,
  UploadOptions,
  RetryOptions,
  RequestConfig,
  ApiResponse,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  FILE_EXTENSIONS
} from './types';

export class SachainApiClient {
  private config: ApiConfig;
  private session: UserSession | null = null;

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config
    };
  }

  // Authentication methods
  setSession(session: UserSession): void {
    this.session = session;
  }

  clearSession(): void {
    this.session = null;
  }

  getSession(): UserSession | null {
    return this.session;
  }

  // HTTP client methods
  private async makeRequest<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${config.url}`;
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    // Add authentication header if session exists
    if (this.session?.tokens.accessToken) {
      headers['Authorization'] = `Bearer ${this.session.tokens.accessToken}`;
    }

    const requestConfig: RequestInit = {
      method: config.method,
      headers,
      signal: AbortSignal.timeout(config.timeout || this.config.timeout!),
    };

    if (config.body && config.method !== 'GET') {
      requestConfig.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, requestConfig);
      const data = await response.json();

      if (!response.ok) {
        throw this.createApiError(data, response.status);
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        requestId: data.requestId
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection failed');
      }
      throw error;
    }
  }

  private createApiError(errorData: any, status: number): ApiError {
    const error: ApiError = {
      message: errorData.message || 'An error occurred',
      requestId: errorData.requestId,
      details: errorData.details
    };

    // Add status code to error for easier handling
    (error as any).status = status;
    return error;
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  // Retry wrapper
  private async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = this.config.retryAttempts!,
      baseDelay = 1000,
      maxDelay = 30000
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if ((error as any).status >= 400 && (error as any).status < 500) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // File validation
  validateFile(file: File): FileValidationResult {
    const errors: string[] = [];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
      errors.push(`Invalid file type. Only ${ALLOWED_FILE_TYPES.join(', ')} are allowed`);
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const allowedExtensions = FILE_EXTENSIONS[file.type as keyof typeof FILE_EXTENSIONS];
    if (allowedExtensions && !allowedExtensions.includes(extension)) {
      errors.push(`Invalid file extension. Expected ${allowedExtensions.join(' or ')}`);
    }

    // Check file name format
    const fileNameRegex = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|pdf)$/i;
    if (!fileNameRegex.test(file.name)) {
      errors.push('Invalid file name format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        size: file.size,
        mimeType: file.type,
        extension
      }
    };
  }

  // Convert file to base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data:mime/type;base64, prefix
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
    });
  }

  // KYC Upload methods
  async generatePresignedUrl(request: PresignedUrlRequest): Promise<UploadResponse> {
    const response = await this.withRetry(() =>
      this.makeRequest<UploadResponse>({
        method: 'POST',
        url: '/kyc/presigned-url',
        body: request
      })
    );
    return response.data;
  }

  async directUpload(request: DirectUploadRequest): Promise<UploadResponse> {
    const response = await this.withRetry(() =>
      this.makeRequest<UploadResponse>({
        method: 'POST',
        url: '/kyc/upload',
        body: request
      })
    );
    return response.data;
  }

  async processUpload(request: UploadProcessingRequest): Promise<{ message: string; documentId: string; status: string }> {
    const response = await this.withRetry(() =>
      this.makeRequest<{ message: string; documentId: string; status: string }>({
        method: 'POST',
        url: '/kyc/process-upload',
        body: request
      })
    );
    return response.data;
  }

  // High-level upload method
  async uploadDocument(
    file: File,
    documentType: 'passport' | 'driver_license' | 'national_id' | 'utility_bill',
    options: UploadOptions = {}
  ): Promise<UploadResponse> {
    if (!this.session) {
      throw new Error('User session required for upload');
    }

    // Validate file if requested
    if (options.validateFile !== false) {
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }
    }

    const userId = this.session.userId;

    if (options.usePresignedUrl) {
      return this.uploadWithPresignedUrl(file, documentType, userId, options);
    } else {
      return this.uploadDirect(file, documentType, userId, options);
    }
  }

  private async uploadDirect(
    file: File,
    documentType: 'passport' | 'driver_license' | 'national_id' | 'utility_bill',
    userId: string,
    options: UploadOptions
  ): Promise<UploadResponse> {
    const fileContent = await this.fileToBase64(file);

    const request: DirectUploadRequest = {
      userId,
      documentType,
      fileName: file.name,
      contentType: file.type as any,
      fileContent
    };

    return this.directUpload(request);
  }

  private async uploadWithPresignedUrl(
    file: File,
    documentType: 'passport' | 'driver_license' | 'national_id' | 'utility_bill',
    userId: string,
    options: UploadOptions
  ): Promise<UploadResponse> {
    // Step 1: Get presigned URL
    const presignedRequest: PresignedUrlRequest = {
      userId,
      documentType,
      fileName: file.name,
      contentType: file.type as any
    };

    const presignedResponse = await this.generatePresignedUrl(presignedRequest);

    // Step 2: Upload to S3 with progress tracking
    await this.uploadToS3(presignedResponse.uploadUrl!, file, options.onProgress);

    // Step 3: Process the upload
    const s3Key = this.extractS3KeyFromUrl(presignedResponse.uploadUrl!);
    const processRequest: UploadProcessingRequest = {
      documentId: presignedResponse.documentId,
      userId,
      s3Key,
      fileSize: file.size
    };

    await this.processUpload(processRequest);

    return {
      documentId: presignedResponse.documentId,
      message: 'File uploaded successfully'
    };
  }

  private async uploadToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('S3 upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  private extractS3KeyFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  }

  // Admin Review methods
  async approveDocument(request: AdminReviewRequest): Promise<AdminReviewResponse> {
    const response = await this.withRetry(() =>
      this.makeRequest<AdminReviewResponse>({
        method: 'POST',
        url: '/admin/approve',
        body: request
      })
    );
    return response.data;
  }

  async rejectDocument(request: AdminReviewRequest): Promise<AdminReviewResponse> {
    if (!request.comments || request.comments.trim().length === 0) {
      throw new Error('Comments are required for document rejection');
    }

    const response = await this.withRetry(() =>
      this.makeRequest<AdminReviewResponse>({
        method: 'POST',
        url: '/admin/reject',
        body: request
      })
    );
    return response.data;
  }

  async getDocuments(request: GetDocumentsRequest = {}): Promise<GetDocumentsResponse> {
    const params = new URLSearchParams();
    
    if (request.status) {
      params.append('status', request.status);
    }
    
    if (request.limit) {
      params.append('limit', request.limit.toString());
    }

    const queryString = params.toString();
    const url = `/admin/documents${queryString ? `?${queryString}` : ''}`;

    const response = await this.withRetry(() =>
      this.makeRequest<GetDocumentsResponse>({
        method: 'GET',
        url
      })
    );
    return response.data;
  }

  // Utility methods
  async getUserProfile(userId?: string): Promise<UserProfile> {
    const targetUserId = userId || this.session?.userId;
    if (!targetUserId) {
      throw new Error('User ID required');
    }

    const response = await this.withRetry(() =>
      this.makeRequest<UserProfile>({
        method: 'GET',
        url: `/users/${targetUserId}/profile`
      })
    );
    return response.data;
  }

  async getUserDocuments(userId?: string): Promise<KYCDocument[]> {
    const targetUserId = userId || this.session?.userId;
    if (!targetUserId) {
      throw new Error('User ID required');
    }

    const response = await this.withRetry(() =>
      this.makeRequest<{ documents: KYCDocument[] }>({
        method: 'GET',
        url: `/users/${targetUserId}/documents`
      })
    );
    return response.data.documents;
  }
}

// Factory function for creating client instance
export function createSachainClient(config: ApiConfig): SachainApiClient {
  return new SachainApiClient(config);
}

// Default export
export default SachainApiClient;