// Code examples for common Sachain API integration patterns

import { SachainApiClient, createSachainClient } from './client';
import { UserSession, KYCDocument, ApiError } from './types';

// Example 1: Initialize SDK and authenticate user
export async function initializeSdk() {
  const client = createSachainClient({
    baseUrl: 'https://api.sachain.com/v1',
    timeout: 30000,
    retryAttempts: 3
  });

  // Set user session (typically from Cognito authentication)
  const userSession: UserSession = {
    userId: 'user-123',
    email: 'user@example.com',
    userType: 'entrepreneur',
    kycStatus: 'not_started',
    tokens: {
      accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  };

  client.setSession(userSession);
  return client;
}

// Example 2: Upload KYC document with progress tracking
export async function uploadKycDocument(
  client: SachainApiClient,
  file: File
): Promise<string> {
  try {
    // Validate file before upload
    const validation = client.validateFile(file);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    console.log('Starting document upload...');
    
    const result = await client.uploadDocument(
      file,
      'national_id',
      {
        usePresignedUrl: true, // Use presigned URL for better performance
        onProgress: (progress) => {
          console.log(`Upload progress: ${progress.toFixed(1)}%`);
        }
      }
    );

    console.log('Document uploaded successfully:', result.documentId);
    return result.documentId;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Example 3: Handle different types of API errors
export async function handleApiErrors(client: SachainApiClient) {
  try {
    await client.getDocuments({ status: 'pending' });
  } catch (error) {
    const apiError = error as ApiError;
    
    switch (apiError.details?.code) {
      case 'AUTH_TOKEN_INVALID':
        console.log('Token expired, need to refresh');
        // Implement token refresh logic
        break;
        
      case 'AUTH_INSUFFICIENT_PERMISSIONS':
        console.log('User lacks admin permissions');
        // Redirect to unauthorized page
        break;
        
      case 'RATE_LIMIT_EXCEEDED':
        console.log('Rate limited, retrying after delay');
        const retryAfter = apiError.details?.retryAfter || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        // Retry the operation
        break;
        
      case 'SYSTEM_DATABASE_ERROR':
        console.log('Temporary system error, retrying...');
        // SDK will automatically retry these errors
        break;
        
      default:
        console.error('Unexpected error:', apiError.message);
        // Show generic error message to user
    }
  }
}

// Example 4: Admin workflow - Review pending documents
export async function adminReviewWorkflow(client: SachainApiClient) {
  try {
    // Get pending documents
    console.log('Fetching pending documents...');
    const response = await client.getDocuments({
      status: 'pending',
      limit: 10
    });

    console.log(`Found ${response.count} pending documents`);

    for (const document of response.documents) {
      console.log(`Reviewing document ${document.documentId} for user ${document.userId}`);
      
      // Simulate admin decision logic
      const shouldApprove = Math.random() > 0.3; // 70% approval rate
      
      if (shouldApprove) {
        await client.approveDocument({
          userId: document.userId,
          documentId: document.documentId,
          comments: 'Document verified successfully'
        });
        console.log(`Approved document ${document.documentId}`);
      } else {
        await client.rejectDocument({
          userId: document.userId,
          documentId: document.documentId,
          comments: 'Document is unclear, please upload a higher quality image'
        });
        console.log(`Rejected document ${document.documentId}`);
      }
    }
  } catch (error) {
    console.error('Admin review workflow failed:', error);
  }
}

// Example 5: Batch upload multiple documents
export async function batchUploadDocuments(
  client: SachainApiClient,
  files: File[]
): Promise<string[]> {
  const documentIds: string[] = [];
  const errors: string[] = [];

  console.log(`Starting batch upload of ${files.length} documents`);

  // Process uploads sequentially to avoid rate limiting
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      console.log(`Uploading file ${i + 1}/${files.length}: ${file.name}`);
      
      const documentId = await uploadKycDocument(client, file);
      documentIds.push(documentId);
      
      // Add delay between uploads to respect rate limits
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      const errorMessage = `Failed to upload ${file.name}: ${(error as Error).message}`;
      errors.push(errorMessage);
      console.error(errorMessage);
    }
  }

  console.log(`Batch upload completed. Success: ${documentIds.length}, Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.error('Upload errors:', errors);
  }

  return documentIds;
}

// Example 6: Real-time document status monitoring
export async function monitorDocumentStatus(
  client: SachainApiClient,
  documentId: string,
  onStatusChange: (status: string) => void
): Promise<void> {
  let currentStatus: string | null = null;
  
  const checkStatus = async () => {
    try {
      const documents = await client.getUserDocuments();
      const document = documents.find(doc => doc.documentId === documentId);
      
      if (document && document.status !== currentStatus) {
        currentStatus = document.status;
        onStatusChange(document.status);
        
        // Stop monitoring if document is processed
        if (document.status === 'approved' || document.status === 'rejected') {
          clearInterval(intervalId);
        }
      }
    } catch (error) {
      console.error('Error checking document status:', error);
    }
  };

  // Check status every 30 seconds
  const intervalId = setInterval(checkStatus, 30000);
  
  // Initial check
  await checkStatus();
  
  // Clean up after 10 minutes
  setTimeout(() => {
    clearInterval(intervalId);
  }, 10 * 60 * 1000);
}

// Example 7: File validation and preprocessing
export function preprocessFile(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // For images, we can resize them if they're too large
    if (file.type.startsWith('image/')) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx!.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(processedFile);
          } else {
            reject(new Error('Failed to process image'));
          }
        }, file.type, 0.8); // 80% quality
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    } else {
      // For non-images, return as-is
      resolve(file);
    }
  });
}

// Example 8: React Hook for KYC upload
export function useKycUpload(client: SachainApiClient) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const uploadDocument = useCallback(async (
    file: File,
    documentType: 'national_id' | 'passport' | 'driver_license' | 'utility_bill'
  ) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      // Preprocess file if needed
      const processedFile = await preprocessFile(file);
      
      const result = await client.uploadDocument(
        processedFile,
        documentType,
        {
          onProgress: setProgress,
          usePresignedUrl: true
        }
      );
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [client]);
  
  return {
    uploadDocument,
    uploading,
    progress,
    error,
    clearError: () => setError(null)
  };
}

// Example 9: Admin dashboard data fetching
export async function fetchAdminDashboardData(client: SachainApiClient) {
  try {
    const [pendingDocs, approvedDocs, rejectedDocs] = await Promise.all([
      client.getDocuments({ status: 'pending', limit: 100 }),
      client.getDocuments({ status: 'approved', limit: 100 }),
      client.getDocuments({ status: 'rejected', limit: 100 })
    ]);

    const dashboardData = {
      pending: {
        count: pendingDocs.count,
        documents: pendingDocs.documents
      },
      approved: {
        count: approvedDocs.count,
        documents: approvedDocs.documents
      },
      rejected: {
        count: rejectedDocs.count,
        documents: rejectedDocs.documents
      },
      totalDocuments: pendingDocs.count + approvedDocs.count + rejectedDocs.count
    };

    return dashboardData;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    throw error;
  }
}

// Example 10: Offline support with local storage
export class OfflineKycManager {
  private static STORAGE_KEY = 'sachain_offline_uploads';
  
  static saveOfflineUpload(file: File, documentType: string): string {
    const uploadId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert file to base64 for storage
    const reader = new FileReader();
    reader.onload = () => {
      const offlineUploads = this.getOfflineUploads();
      offlineUploads[uploadId] = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType,
        fileContent: (reader.result as string).split(',')[1],
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offlineUploads));
    };
    
    reader.readAsDataURL(file);
    return uploadId;
  }
  
  static getOfflineUploads(): Record<string, any> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }
  
  static async syncOfflineUploads(client: SachainApiClient): Promise<void> {
    const offlineUploads = this.getOfflineUploads();
    const uploadIds = Object.keys(offlineUploads);
    
    if (uploadIds.length === 0) {
      return;
    }
    
    console.log(`Syncing ${uploadIds.length} offline uploads...`);
    
    for (const uploadId of uploadIds) {
      const upload = offlineUploads[uploadId];
      
      try {
        await client.directUpload({
          userId: client.getSession()!.userId,
          documentType: upload.documentType,
          fileName: upload.fileName,
          contentType: upload.fileType,
          fileContent: upload.fileContent
        });
        
        // Remove from offline storage after successful upload
        delete offlineUploads[uploadId];
        console.log(`Synced offline upload: ${upload.fileName}`);
      } catch (error) {
        console.error(`Failed to sync offline upload ${upload.fileName}:`, error);
      }
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offlineUploads));
    console.log('Offline sync completed');
  }
  
  static clearOfflineUploads(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

// Helper function to check if we need React imports
declare const useState: any;
declare const useCallback: any;