import {
  EventValidator,
  KYCDocumentUploadedEvent,
  KYCUploadDetail,
  DOCUMENT_TYPES,
  ALLOWED_CONTENT_TYPES,
} from "../types";

describe("EventValidator", () => {
  const validEventDetail: KYCUploadDetail = {
    documentId: "doc-123",
    userId: "user-456",
    documentType: "national_id",
    fileName: "id-card.jpg",
    fileSize: 1024000, // 1MB
    contentType: "image/jpeg",
    s3Key: "kyc-documents/user-456/doc-123/id-card.jpg",
    s3Bucket: "sachain-kyc-documents",
    uploadedAt: "2024-01-15T10:30:00.000Z",
    metadata: { source: "mobile-app" },
  };

  const validEvent: KYCDocumentUploadedEvent = {
    version: "0",
    id: "event-123",
    "detail-type": "KYC Document Uploaded",
    source: "sachain.kyc",
    account: "123456789012",
    time: "2024-01-15T10:30:00.000Z",
    region: "us-east-1",
    detail: validEventDetail,
  };

  describe("validateKYCUploadEvent", () => {
    it("should validate a correct event structure", () => {
      const result = EventValidator.validateKYCUploadEvent(validEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject null or undefined events", () => {
      const result1 = EventValidator.validateKYCUploadEvent(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain("Event must be a valid object");

      const result2 = EventValidator.validateKYCUploadEvent(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain("Event must be a valid object");
    });

    it("should reject events with wrong version", () => {
      const invalidEvent = { ...validEvent, version: "1" };
      const result = EventValidator.validateKYCUploadEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event version must be "0"');
    });

    it("should reject events with missing id", () => {
      const invalidEvent = { ...validEvent, id: "" };
      const result = EventValidator.validateKYCUploadEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Event id must be a non-empty string");
    });

    it("should reject events with wrong detail-type", () => {
      const invalidEvent = { ...validEvent, "detail-type": "Wrong Type" };
      const result = EventValidator.validateKYCUploadEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Event detail-type must be "KYC Document Uploaded"'
      );
    });

    it("should reject events with wrong source", () => {
      const invalidEvent = { ...validEvent, source: "wrong.source" };
      const result = EventValidator.validateKYCUploadEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Event source must be "sachain.kyc"');
    });

    it("should reject events with invalid time format", () => {
      const invalidEvent = { ...validEvent, time: "invalid-date" };
      const result = EventValidator.validateKYCUploadEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Event time must be a valid ISO date string"
      );
    });

    it("should reject events with missing required fields", () => {
      const invalidEvent = {
        version: "0",
        id: "test",
        // Missing other required fields
      };
      const result = EventValidator.validateKYCUploadEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("validateKYCUploadDetail", () => {
    it("should validate correct event detail", () => {
      const result = EventValidator.validateKYCUploadDetail(validEventDetail);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject null or undefined detail", () => {
      const result = EventValidator.validateKYCUploadDetail(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Event detail must be a valid object");
    });

    it("should reject invalid documentId format", () => {
      const invalidDetail = { ...validEventDetail, documentId: "doc@123!" };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "documentId must contain only alphanumeric characters, hyphens, and underscores"
      );
    });

    it("should reject invalid userId format", () => {
      const invalidDetail = { ...validEventDetail, userId: "user@456!" };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "userId must contain only alphanumeric characters, hyphens, and underscores"
      );
    });

    it("should reject invalid documentType", () => {
      const invalidDetail = {
        ...validEventDetail,
        documentType: "invalid_type" as any,
      };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `documentType must be one of: ${DOCUMENT_TYPES.join(", ")}`
      );
    });

    it("should reject invalid fileName format", () => {
      const invalidDetail = {
        ...validEventDetail,
        fileName: "invalid-file.exe",
      };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "fileName must have a valid format with allowed extensions (jpg, jpeg, png, pdf)"
      );
    });

    it("should reject invalid fileSize", () => {
      const invalidDetail1 = { ...validEventDetail, fileSize: 0 };
      const result1 = EventValidator.validateKYCUploadDetail(invalidDetail1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain("fileSize must be a positive number");

      const invalidDetail2 = {
        ...validEventDetail,
        fileSize: 15 * 1024 * 1024,
      }; // 15MB
      const result2 = EventValidator.validateKYCUploadDetail(invalidDetail2);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain("fileSize must not exceed 10MB");
    });

    it("should reject invalid contentType", () => {
      const invalidDetail = {
        ...validEventDetail,
        contentType: "text/plain" as any,
      };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `contentType must be one of: ${ALLOWED_CONTENT_TYPES.join(", ")}`
      );
    });

    it("should reject invalid s3Key format", () => {
      const invalidDetail = {
        ...validEventDetail,
        s3Key: "invalid key with spaces!",
      };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "s3Key must contain only valid S3 key characters"
      );
    });

    it("should reject invalid s3Bucket format", () => {
      const invalidDetail = {
        ...validEventDetail,
        s3Bucket: "Invalid_Bucket_Name!",
      };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "s3Bucket must be a valid S3 bucket name"
      );
    });

    it("should reject invalid uploadedAt format", () => {
      const invalidDetail = { ...validEventDetail, uploadedAt: "invalid-date" };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "uploadedAt must be a valid ISO date string"
      );
    });

    it("should reject invalid metadata format", () => {
      const invalidDetail = {
        ...validEventDetail,
        metadata: "not-an-object" as any,
      };
      const result = EventValidator.validateKYCUploadDetail(invalidDetail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "metadata must be a valid object if provided"
      );

      const invalidDetail2 = {
        ...validEventDetail,
        metadata: ["array"] as any,
      };
      const result2 = EventValidator.validateKYCUploadDetail(invalidDetail2);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain(
        "metadata must be a valid object if provided"
      );
    });

    it("should accept valid metadata", () => {
      const validDetail = {
        ...validEventDetail,
        metadata: { key: "value", number: 123 },
      };
      const result = EventValidator.validateKYCUploadDetail(validDetail);
      expect(result.isValid).toBe(true);
    });

    it("should accept undefined metadata", () => {
      const validDetail = { ...validEventDetail };
      delete validDetail.metadata;
      const result = EventValidator.validateKYCUploadDetail(validDetail);
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateEventSource", () => {
    it("should validate trusted source", () => {
      const result = EventValidator.validateEventSource(validEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject untrusted source", () => {
      const untrustedEvent = {
        ...validEvent,
        source: "malicious.source",
      } as any;
      const result = EventValidator.validateEventSource(untrustedEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Event source "malicious.source" is not in the list of trusted sources: sachain.kyc'
      );
    });

    it("should validate custom trusted sources", () => {
      const customEvent = { ...validEvent, source: "custom.source" } as any;
      const result = EventValidator.validateEventSource(customEvent, [
        "custom.source",
        "other.source",
      ]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("validateEventTiming", () => {
    it("should validate recent event", () => {
      const recentTime = new Date().toISOString();
      const recentEvent = {
        ...validEvent,
        time: recentTime,
        detail: { ...validEventDetail, uploadedAt: recentTime },
      };
      const result = EventValidator.validateEventTiming(recentEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject old events", () => {
      const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      const oldEvent = {
        ...validEvent,
        time: oldTime,
        detail: { ...validEventDetail, uploadedAt: oldTime },
      };
      const result = EventValidator.validateEventTiming(oldEvent, 60); // 60 minutes max age
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Event is too old");
    });

    it("should reject future events", () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes in future
      const futureEvent = {
        ...validEvent,
        time: futureTime,
        detail: { ...validEventDetail, uploadedAt: futureTime },
      };
      const result = EventValidator.validateEventTiming(futureEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Event time is too far in the future");
    });

    it("should reject events with inconsistent timing", () => {
      const eventTime = new Date().toISOString();
      const uploadTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes earlier
      const inconsistentEvent = {
        ...validEvent,
        time: eventTime,
        detail: { ...validEventDetail, uploadedAt: uploadTime },
      };
      const result = EventValidator.validateEventTiming(inconsistentEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Event time and upload time are inconsistent"
      );
    });
  });

  describe("validateCompleteEvent", () => {
    it("should validate a completely valid event", () => {
      const recentTime = new Date().toISOString();
      const completeEvent = {
        ...validEvent,
        time: recentTime,
        detail: { ...validEventDetail, uploadedAt: recentTime },
      };
      const result = EventValidator.validateCompleteEvent(completeEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject event with multiple validation failures", () => {
      const invalidEvent = {
        ...validEvent,
        version: "1", // Wrong version
        source: "untrusted.source", // Wrong source
        time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Too old
      };
      const result = EventValidator.validateCompleteEvent(invalidEvent);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("should stop validation early if structure is invalid", () => {
      const result = EventValidator.validateCompleteEvent(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Event must be a valid object");
      // Should not contain timing or source validation errors
      expect(result.errors.length).toBe(1);
    });

    it("should use custom validation parameters", () => {
      const customEvent = {
        ...validEvent,
        source: "custom.source",
        time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        detail: {
          ...validEventDetail,
          uploadedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      } as any;
      const result = EventValidator.validateCompleteEvent(
        customEvent,
        ["custom.source"], // Custom trusted sources
        15 // 15 minutes max age
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases and boundary conditions", () => {
    it("should handle events with exactly maximum file size", () => {
      const maxSizeDetail = { ...validEventDetail, fileSize: 10 * 1024 * 1024 }; // Exactly 10MB
      const result = EventValidator.validateKYCUploadDetail(maxSizeDetail);
      expect(result.isValid).toBe(true);
    });

    it("should handle events with minimum valid file size", () => {
      const minSizeDetail = { ...validEventDetail, fileSize: 1 }; // 1 byte
      const result = EventValidator.validateKYCUploadDetail(minSizeDetail);
      expect(result.isValid).toBe(true);
    });

    it("should handle all valid document types", () => {
      DOCUMENT_TYPES.forEach((docType) => {
        const detail = { ...validEventDetail, documentType: docType };
        const result = EventValidator.validateKYCUploadDetail(detail);
        expect(result.isValid).toBe(true);
      });
    });

    it("should handle all valid content types", () => {
      ALLOWED_CONTENT_TYPES.forEach((contentType) => {
        const detail = { ...validEventDetail, contentType };
        const result = EventValidator.validateKYCUploadDetail(detail);
        expect(result.isValid).toBe(true);
      });
    });

    it("should handle events at timing boundary conditions", () => {
      const now = new Date();

      // Event exactly at max age boundary
      const boundaryTime = new Date(
        now.getTime() - 60 * 60 * 1000
      ).toISOString(); // Exactly 60 minutes ago
      const boundaryEvent = {
        ...validEvent,
        time: boundaryTime,
        detail: { ...validEventDetail, uploadedAt: boundaryTime },
      };
      const result = EventValidator.validateEventTiming(boundaryEvent, 60);
      expect(result.isValid).toBe(true);

      // Event just over max age boundary
      const overBoundaryTime = new Date(
        now.getTime() - 61 * 60 * 1000
      ).toISOString(); // 61 minutes ago
      const overBoundaryEvent = {
        ...validEvent,
        time: overBoundaryTime,
        detail: { ...validEventDetail, uploadedAt: overBoundaryTime },
      };
      const result2 = EventValidator.validateEventTiming(overBoundaryEvent, 60);
      expect(result2.isValid).toBe(false);
    });
  });
});
