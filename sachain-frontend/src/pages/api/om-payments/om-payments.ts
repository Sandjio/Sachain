import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const API_URL = process.env.NEXT_PUBLIC_KYC_API_BASE;

    if (!API_URL) {
      console.error('NEXT_PUBLIC_KYC_API_BASE is not configured');
      return res.status(500).json({ message: 'API URL not configured' });
    }

    console.log('📡 Proxying request to:', `${API_URL}/om-payments`);
    console.log('📦 Request body:', req.body);
    console.log('🔑 Authorization:', req.headers.authorization ? 'Present' : 'Missing');

    const response = await fetch(`${API_URL}/om-payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    console.log('✅ AWS Response status:', response.status);
    console.log('📄 AWS Response data:', data);

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
