// src/features/auth/core/kycService.ts

const BASE_URL = process.env.NEXT_PUBLIC_KYC_API_BASE!;

export async function uploadKycDocument({
  idToken,
  file,
  documentType = "national_id",
}: {
  idToken: string;
  file: File;
  documentType?: "national_id" | "passport" | "driver_license";
}) {
  // convert file → base64
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (err) => reject(err);
    });

  const base64Content = await toBase64(file);

  const res = await fetch(`${BASE_URL}/kyc/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      documentType,
      fileName: file.name,
      //contentType: file.type,
      contentType: "application/pdf",
      fileContent: base64Content,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "KYC upload failed");
  }

  return res.json();
}
