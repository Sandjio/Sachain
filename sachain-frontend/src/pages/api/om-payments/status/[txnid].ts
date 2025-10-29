import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { txnid } = req.query;

  if (!txnid || typeof txnid !== 'string') {
    return res.status(400).json({ message: 'Transaction ID is required' });
  }

  try {
    const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE;

    if (!API_URL) {
      console.error('❌ NEXT_PUBLIC_KYC_API_BASE not configured');
      return res.status(500).json({ message: 'API URL not configured' });
    }

    // FIX: Correct URL construction - don't duplicate /om-payments
    const statusUrl = `${API_URL}/om-payments/status/${txnid}`;
    console.log('🔍 Checking payment status at:', statusUrl);

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
      },
    });

    console.log('📡 AWS Response status:', response.status);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Non-JSON response from AWS:', text);

      // Return PENDING so polling continues
      return res.status(200).json({
        status: 'PENDING',
        message: 'Status endpoint unavailable, check again shortly',
      });
    }

    const data = await response.json();
    console.log('📊 Payment status data:', data);

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('❌ Status check error:', error);

    // Return PENDING instead of error to keep polling
    return res.status(200).json({
      status: 'PENDING',
      message: 'Temporary error, retrying...',
    });
  }
}
